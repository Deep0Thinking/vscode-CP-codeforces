import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';


// Provides a tree data structure for displaying problems grouped by tags in the tree view
export class DifficultyProblemsProvider implements vscode.TreeDataProvider<CodeforcesProblem | { label: string; rating: number }> {
  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | { label: string; rating: number } | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | { label: string; rating: number } | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | { label: string; rating: number } | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  // Refresh the tree view by firing the onDidChangeTreeData event
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // Return a tree item for a given problem or rating element
  getTreeItem(element: CodeforcesProblem | { label: string; rating: number }): vscode.TreeItem {
    if (this.isLabelRatingElement(element)) {
      const folder = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      folder.contextValue = 'ratingFolder';
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

  // Helper method to check if an element is a label/rating element
  private isLabelRatingElement(element: CodeforcesProblem | { label: string; rating: number }): element is { label: string; rating: number } {
    return 'label' in element;
  }
  
  // Return the children of a given element or the root if no element is provided
  async getChildren(element?: CodeforcesProblem | { label: string; rating: number }): Promise<CodeforcesProblem[] | { label: string; rating: number }[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();

        // Group problems by rating
        const problemsByRating: { [rating: number]: CodeforcesProblem[] } = {};
        problems.forEach((problem) => {
          if (!problemsByRating[problem.rating]) {
            problemsByRating[problem.rating] = [];
          }
          problemsByRating[problem.rating].push(problem);
        });

        // Create rating folders
        const ratingFolders = Object.keys(problemsByRating)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((rating) => ({ label: `Rating: ${rating}`, rating: parseInt(rating) }));

        return ratingFolders;
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error fetching problems: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('Error fetching problems');
        }
        return [];
      }
    } else if ('rating' in element) {
      const problems = await this.api.getProblemsByRating(element.rating);
      return problems;
    }
    return [];
  }
}