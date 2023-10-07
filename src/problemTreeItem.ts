import * as vscode from "vscode";
import { CodeforcesProblem } from "./models";

export class ProblemTreeItem extends vscode.TreeItem {
  constructor(
    public readonly problem: CodeforcesProblem,
    public readonly verdict?: string | null
  ) {
    super(
      `[${problem.rating}] [${problem.contestId}-${problem.index}] ${
        problem.name
      } ${verdict ? `[${verdict}]` : ""}`,
      vscode.TreeItemCollapsibleState.None
    );
  }

  get ratingTooltip(): string {
    return `${this.label}\nRating: ${this.problem.rating}`;
  }
}
