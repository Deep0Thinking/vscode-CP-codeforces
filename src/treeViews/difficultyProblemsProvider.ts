import * as vscode from "vscode";
import { CodeforcesApi } from "../codeforcesApi";
import { CodeforcesProblem } from "../models";
import { ProblemTreeItem } from "../problemTreeItem";

export class DifficultyProblemsProvider
  implements
    vscode.TreeDataProvider<
      CodeforcesProblem | { label: string; rating: number }
    >
{
  private sortOrder: "RatingAsc" | "RatingDesc" = "RatingAsc";

  private api: CodeforcesApi;
  private _onDidChangeTreeData: vscode.EventEmitter<
    | CodeforcesProblem
    | { label: string; rating: number }
    | undefined
    | null
    | void
  > = new vscode.EventEmitter<
    | CodeforcesProblem
    | { label: string; rating: number }
    | undefined
    | null
    | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    | CodeforcesProblem
    | { label: string; rating: number }
    | undefined
    | null
    | void
  > = this._onDidChangeTreeData.event;

  constructor(api: CodeforcesApi) {
    this.api = api;
    this.sortOrder =
      vscode.workspace
        .getConfiguration("CPcodeforces")
        .get<string>("difficultySortOrder") === "RatingDesc"
        ? "RatingDesc"
        : "RatingAsc";
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(
    element: CodeforcesProblem | { label: string; rating: number }
  ): vscode.TreeItem {
    if (this.isLabelRatingElement(element)) {
      const folder = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      folder.contextValue = "ratingFolder";
      return folder;
    } else {
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
  }

  private isLabelRatingElement(
    element: CodeforcesProblem | { label: string; rating: number }
  ): element is { label: string; rating: number } {
    return "label" in element;
  }

  async getChildren(
    element?: CodeforcesProblem | { label: string; rating: number }
  ): Promise<CodeforcesProblem[] | { label: string; rating: number }[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();

        const problemsByRating: { [rating: string]: CodeforcesProblem[] } = {};
        problems.forEach((problem) => {
          const ratingKey =
            problem.rating === undefined
              ? "undefined"
              : problem.rating.toString();
          if (!problemsByRating[ratingKey]) {
            problemsByRating[ratingKey] = [];
          }
          problemsByRating[ratingKey].push(problem);
        });

        const ratingFolders = Object.keys(problemsByRating)
          .filter((rating) => rating !== "undefined")
          .sort((a, b) =>
            this.sortOrder === "RatingAsc"
              ? parseInt(a) - parseInt(b)
              : parseInt(b) - parseInt(a)
          )
          .map((rating) => ({
            label: `Rating: ${rating}`,
            rating: parseInt(rating),
          }));

        ratingFolders.push({ label: "Rating: undefined", rating: NaN });

        return ratingFolders;
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(
            `Error fetching problems: ${error.message}`
          );
        } else {
          vscode.window.showErrorMessage("Error fetching problems");
        }
        return [];
      }
    } else if ("rating" in element) {
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

  toggleSortOrder(): void {
    this.sortOrder =
      this.sortOrder === "RatingAsc" ? "RatingDesc" : "RatingAsc";

    const config = vscode.workspace.getConfiguration("CPcodeforces");
    config.update("difficultySortOrder", this.sortOrder, true);

    this.refresh();
  }

  getSortOrder(): "RatingAsc" | "RatingDesc" {
    return this.sortOrder;
  }
}
