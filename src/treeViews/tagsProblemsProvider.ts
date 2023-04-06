import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';


// Provides a tree data structure for displaying problems grouped by tags in the tree view
export class TagsProblemsProvider implements vscode.TreeDataProvider<CodeforcesProblem | { label: string; tag: string }> {
  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | { label: string; tag: string } | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | { label: string; tag: string } | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | { label: string; tag: string } | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  // Refresh the tree view by firing the onDidChangeTreeData event
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // Get the tree item for the given problem
  getTreeItem(element: CodeforcesProblem | { label: string; tag: string }): vscode.TreeItem {
    if (this.isLabelTagElement(element)) {
      const folder = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      folder.contextValue = 'tagFolder';
      return folder;
    } else {
      const treeItem = new ProblemTreeItem(element);
      treeItem.tooltip = treeItem.ratingTooltip;
      treeItem.command = {
        command: 'extension.showProblemDescription',
        title: 'Show Problem Description',
        arguments: [element],
      };
      return treeItem;
    }
  }

  // Helper method to check if an element is a label/tag element
  private isLabelTagElement(element: CodeforcesProblem | { label: string; tag: string }): element is { label: string; tag: string } {
    return 'label' in element;
  }

  // Return the children of a given element or the root if no element is provided
  async getChildren(element?: CodeforcesProblem | { label: string; tag: string }): Promise<CodeforcesProblem[] | { label: string; tag: string }[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();

        // Group problems by tag
        const problemsByTag: { [tag: string]: CodeforcesProblem[] } = {};
        problems.forEach((problem) => {
          problem.tags.forEach((tag) => {
            if (!problemsByTag[tag]) {
              problemsByTag[tag] = [];
            }
            problemsByTag[tag].push(problem);
          });
        });

        // Create tag folders
        const tagFolders = Object.keys(problemsByTag)
          .sort()
          .map((tag) => ({ label: `Tag: ${tag}`, tag }));

        return tagFolders;
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error fetching problems: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('Error fetching problems');
        }
        return [];
      }
    } else if (this.isLabelTagElement(element)) {
      const problems = await this.api.getProblemsByTag(element.tag);
      return problems;
    }
    return [];
  }

  // Fetch all problems and return those that have the specified tag
  async getProblemsByTag(tag: string): Promise<CodeforcesProblem[]> {
    const problems = await this.api.getAllProblems();
    return problems.filter(problem => problem.tags.includes(tag));
  }
}