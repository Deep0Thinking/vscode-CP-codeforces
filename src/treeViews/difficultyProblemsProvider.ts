import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';
import { UserSubmissions } from '../userSubmissions';


export class DifficultyProblemsProvider implements vscode.TreeDataProvider<CodeforcesProblem | { label: string; rating: number }> {
  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | { label: string; rating: number } | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | { label: string; rating: number } | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | { label: string; rating: number } | undefined | null | void> = this._onDidChangeTreeData.event;

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

  getTreeItem(element: CodeforcesProblem | { label: string; rating: number }): vscode.TreeItem {

    if (this.isLabelRatingElement(element)) {
      const folder = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      folder.contextValue = 'ratingFolder';
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

  private isLabelRatingElement(element: CodeforcesProblem | { label: string; rating: number }): element is { label: string; rating: number } {
    return 'label' in element;
  }

  async getChildren(element?: CodeforcesProblem | { label: string; rating: number }): Promise<CodeforcesProblem[] | { label: string; rating: number }[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();

        const problemsByRating: { [rating: string]: CodeforcesProblem[] } = {};
        problems.forEach((problem) => {
          const ratingKey = problem.rating === undefined ? 'undefined' : problem.rating.toString();
          if (!problemsByRating[ratingKey]) {
            problemsByRating[ratingKey] = [];
          }
          problemsByRating[ratingKey].push(problem);
        });

        const ratingFolders = Object.keys(problemsByRating)
          .filter((rating) => rating !== "undefined")
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((rating) => ({ label: `Rating: ${rating}`, rating: parseInt(rating) }));

        ratingFolders.push({ label: 'Rating: undefined', rating: NaN });

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
      if (isNaN(element.rating)) {
        const problems = await this.api.getAllProblems();
        return problems.filter((problem) => problem.rating === undefined);
      } else {
        const problems = await this.api.getProblemsByRating(element.rating);
        return problems;
      }
    }
    return [];
  }

}