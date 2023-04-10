import * as vscode from 'vscode';
import { CodeforcesProblem } from './models';

export class ProblemTreeItem extends vscode.TreeItem {
  constructor(public readonly problem: CodeforcesProblem) {
    super(`[${problem.rating}] ${problem.name}`, vscode.TreeItemCollapsibleState.None);
  }

  get ratingTooltip(): string {
    return `${this.label}\nRating: ${this.problem.rating}`;
  }

}