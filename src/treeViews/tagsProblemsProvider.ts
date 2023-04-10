import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';
import { UserSubmissions } from '../userSubmissions';

export class TagsProblemsProvider implements vscode.TreeDataProvider<CodeforcesProblem | { label: string; tag: string }> {
  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | { label: string; tag: string } | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | { label: string; tag: string } | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | { label: string; tag: string } | undefined | null | void> = this._onDidChangeTreeData.event;

  private handle: string | undefined;

  handleChanged(handle: string) {
    this.handle = handle;
    this.refresh();
  }

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CodeforcesProblem | { label: string; tag: string }): vscode.TreeItem {
    if (this.isLabelTagElement(element)) {
      const folder = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      folder.contextValue = 'tagFolder';
      return folder;
    } else {

      const latestVerdict = UserSubmissions.getLatestVerdict(element.contestId, element.index);

      const treeItem = new ProblemTreeItem(element, latestVerdict);
      treeItem.tooltip = treeItem.ratingTooltip;
      treeItem.command = {
        command: 'extension.showProblemDescription',
        title: 'Show Problem Description',
        arguments: [element],
      };

      if (latestVerdict === 'OK') {
        treeItem.iconPath = new vscode.ThemeIcon('check');
      } else if (latestVerdict === 'PARTIAL') {
        treeItem.iconPath = new vscode.ThemeIcon('extensions-info-message');
      } else if (latestVerdict !== null && UserSubmissions.isNegativeVerdict(latestVerdict)) {
        treeItem.iconPath = new vscode.ThemeIcon('error');
      }


      return treeItem;
    }
  }

  private isLabelTagElement(element: CodeforcesProblem | { label: string; tag: string }): element is { label: string; tag: string } {
    return 'label' in element;
  }

  async getChildren(element?: CodeforcesProblem | { label: string; tag: string }): Promise<CodeforcesProblem[] | { label: string; tag: string }[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();
        const problemsByTag: { [tag: string]: CodeforcesProblem[] } = {};
        problems.forEach((problem) => {
          problem.tags.forEach((tag) => {
            if (!problemsByTag[tag]) {
              problemsByTag[tag] = [];
            }
            problemsByTag[tag].push(problem);
          });
        });

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

  async getProblemsByTag(tag: string): Promise<CodeforcesProblem[]> {
    const problems = await this.api.getAllProblems();
    return problems.filter(problem => problem.tags.includes(tag));
  }
}