import * as vscode from "vscode";
import { CodeforcesApi } from "../codeforcesApi";
import { CodeforcesProblem } from "../models";
import { ProblemTreeItem } from "../problemTreeItem";

export class RecentProblemsProvider
  implements vscode.TreeDataProvider<CodeforcesProblem>
{
  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<
    CodeforcesProblem | undefined | null | void
  > = new vscode.EventEmitter<CodeforcesProblem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CodeforcesProblem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private recentProblems: CodeforcesProblem[] = [];

  private globalState?: vscode.Memento;

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  setGlobalState(globalState: vscode.Memento) {
    this.globalState = globalState;

    const savedProblems =
      this.globalState.get<CodeforcesProblem[]>("recentProblems");
    if (savedProblems) {
      this.recentProblems = savedProblems;
    }
  }

  getTreeItem(element: CodeforcesProblem): vscode.TreeItem {
    const latestVerdict = this.api.getLatestVerdict(
      element.contestId,
      element.index
    );

    const treeItem = new ProblemTreeItem(element, latestVerdict);
    treeItem.tooltip = treeItem.ratingTooltip;
    treeItem.command = {
      command: "extension.showProblemDescription",
      title: "Show Problem Description",
      arguments: [element],
    };

    if (latestVerdict === "OK") {
      treeItem.iconPath = new vscode.ThemeIcon("check");
    } else if (
      latestVerdict !== null &&
      this.api.isNegativeVerdict(latestVerdict)
    ) {
      treeItem.iconPath = new vscode.ThemeIcon("error");
    }

    return treeItem;
  }

  getChildren(): CodeforcesProblem[] {
    return this.recentProblems;
  }

  addToRecent(problem: CodeforcesProblem) {
    this.recentProblems = this.recentProblems.filter(
      (p) =>
        `${p.contestId}-${p.index}` !== `${problem.contestId}-${problem.index}`
    );
    this.recentProblems.unshift(problem);
    this.recentProblems = this.recentProblems.slice(0, 10);

    if (this.globalState) {
      this.globalState.update("recentProblems", this.recentProblems);
    }

    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
