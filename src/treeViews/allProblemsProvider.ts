import * as vscode from "vscode";
import { CodeforcesApi } from "../codeforcesApi";
import { CodeforcesProblem } from "../models";
import { ProblemTreeItem } from "../problemTreeItem";
import { RecentProblemsProvider } from "./recentProblemsProvider";

type ProblemOrCategory =
  | CodeforcesProblem
  | "Passed"
  | "Failed"
  | "Never Submitted";

enum SortOrder {
  None,
  RatingAsc,
  RatingDesc,
}

export class AllProblemsProvider
  implements vscode.TreeDataProvider<ProblemOrCategory>
{
  private api: CodeforcesApi;
  private currentPanel?: vscode.WebviewPanel;
  private _onDidChangeTreeData: vscode.EventEmitter<
    CodeforcesProblem | undefined | null | void
  > = new vscode.EventEmitter<CodeforcesProblem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CodeforcesProblem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private sortOrder: SortOrder = SortOrder.None;

  private recentProblemsProvider: RecentProblemsProvider;

  async sortProblems(order: SortOrder) {
    this.sortOrder = order;
    const config = vscode.workspace.getConfiguration("CPcodeforces");
    switch (order) {
      case SortOrder.RatingAsc:
        config.update("sortOrder", "RatingAsc", true);
        break;
      case SortOrder.RatingDesc:
        config.update("sortOrder", "RatingDesc", true);
        break;
      default:
        config.update("sortOrder", "None", true);
    }
    this.refresh();
  }

  constructor(
    api: CodeforcesApi,
    recentProblemsProvider: RecentProblemsProvider
  ) {
    this.api = api;
    this.recentProblemsProvider = recentProblemsProvider;
    this.loadSortOrderFromSettings();
  }

  private _passedProblems: CodeforcesProblem[] = [];
  private _failedProblems: CodeforcesProblem[] = [];
  private _neverSubmittedProblems: CodeforcesProblem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProblemOrCategory): vscode.TreeItem {
    if (
      element === "Passed" ||
      element === "Failed" ||
      element === "Never Submitted"
    ) {
      return new vscode.TreeItem(
        element,
        vscode.TreeItemCollapsibleState.Collapsed
      );
    }
    const problem = element as CodeforcesProblem;
    const latestVerdict = this.api.getLatestVerdict(
      problem.contestId,
      problem.index
    );
    const treeItem = new ProblemTreeItem(problem, latestVerdict);
    treeItem.tooltip = treeItem.ratingTooltip;
    treeItem.command = {
      command: "extension.showProblemDescription",
      title: "Show Problem Description",
      arguments: [problem],
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

  async getChildren(
    element?: ProblemOrCategory
  ): Promise<ProblemOrCategory[] | null | undefined> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();
        if (this.sortOrder === SortOrder.RatingAsc) {
          problems.sort((a, b) => {
            if (a.rating === undefined && b.rating === undefined) return 0;
            if (a.rating === undefined) return 1;
            if (b.rating === undefined) return -1;
            return a.rating - b.rating;
          });
        } else if (this.sortOrder === SortOrder.RatingDesc) {
          problems.sort((a, b) => {
            if (a.rating === undefined && b.rating === undefined) return 0;
            if (a.rating === undefined) return 1;
            if (b.rating === undefined) return -1;
            return b.rating - a.rating;
          });
        }
        this._passedProblems = problems.filter(
          (problem) =>
            this.api.getLatestVerdict(problem.contestId, problem.index) === "OK"
        );
        this._failedProblems = problems.filter((problem) => {
          const latestVerdict = this.api.getLatestVerdict(
            problem.contestId,
            problem.index
          );
          return latestVerdict !== "OK" && latestVerdict !== null;
        });
        this._neverSubmittedProblems = problems.filter(
          (problem) =>
            this.api.getLatestVerdict(problem.contestId, problem.index) === null
        );
        return ["Passed", "Failed", "Never Submitted"];
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(
            `Error fetching problems: ${error.message}`
          );
        } else {
          vscode.window.showErrorMessage("Error fetching problems");
        }
        return undefined;
      }
    } else if (element === "Passed") {
      return this._passedProblems;
    } else if (element === "Failed") {
      return this._failedProblems;
    } else if (element === "Never Submitted") {
      return this._neverSubmittedProblems;
    }
    return undefined;
  }

  async showProblemDescription(problem: CodeforcesProblem) {
    const problemUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

    const problemDescriptionHtml = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching the problem...",
        cancellable: false,
      },
      async () => {
        return await this.api.getProblemDescription(problemUrl);
      }
    );

    if (this.currentPanel) {
      this.currentPanel.dispose();
    }

    this.currentPanel = vscode.window.createWebviewPanel(
      "problemDescription",
      problem.name,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.currentPanel.webview.html = `

      <style>

        .title::before, .section-title::before, .header::before {
          content: "";
          display: block;
          height: 1em;
        }

        .header::after {
          content: "";
          display: block;
          height: 1em;
        }


        p {
          font-size: 16px;
        }

        pre {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 10px;
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
          background-color: rgb(250, 250, 250);
        }

        h1, h2 {
          text-align: center;
        }

        code {
          background-color: rgb(224, 224, 224);
          padding: 2px 5px;
          border-radius: 3px;
          color: black;
        }

        .title, .section-title {
          font-size: 20px;
          font-weight: bold;
        }

        .header {
          font-family: Gill Sans;
          font-size: 16px;
        }

        pre .test-example-line.test-example-line-odd {
          background-color: rgb(235, 235, 235);
        }

        pre .test-example-line.test-example-line-even {
          background-color: rgb(224, 224, 224);
        }

        .time-limit, .input-file {
          background-color: rgb(224, 224, 224);
        }

        .memory-limit, .output-file {
          background-color: rgb(238, 238, 238);
        }

        .tex-graphics {
          display: block;
        }

        .code-button {
          position: fixed;
          bottom: 15px;
          right: 15px;
          background-color: #007acc;
          color: white;
          padding: 8px 16px;
          font-size: 16px;
          border: none;
          cursor: pointer;
        }

        .code-button:hover {
          background-color: #005999;
        }

        .submit-button {
          position: fixed;
          bottom: 15px;
          left: 15px;
          background-color: #4CAF50;
          color: white;
          padding: 8px 16px;
          font-size: 16px;
          border: none;
          cursor: pointer;
        }
  
        .submit-button:hover {
          background-color: #45a049;
        }

      </style>

      <script>
        MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['$$$', '$$$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
          }
        };

        const vscode = acquireVsCodeApi();
        function createCodeFile() {
          vscode.postMessage({ command: 'createCodeFile' });
        }

        function submitSolution() {
          vscode.postMessage({ command: 'submitSolution', problemContestId: '${
            problem.contestId
          }', problemIndex: '${problem.index}' });
        }

      </script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

      <body>
        <h1><a href="${problemUrl}" target="_blank">${problem.name}</a></h1>
        <h2>Rating: ${problem.rating}</h2>
        <h3>Tags: ${problem.tags
          .map((tag) => `<code>${tag}</code>`)
          .join(", ")}</h3>
        <hr>
        ${problemDescriptionHtml}
        <hr>
        <br><br><br><br>
        <button class="code-button" onclick="createCodeFile()">Code</button>
        <button class="submit-button" onclick="submitSolution()">Submit</button>
      </body>
    `;

    this.currentPanel.onDidDispose(() => {
      this.currentPanel = undefined;
    });

    this.currentPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "createCodeFile") {
        const languages = [
          { label: "C", value: "C", extension: ".c" },
          { label: "C#", value: "C#", extension: ".cs" },
          { label: "C++", value: "C++", extension: ".cpp" },
          { label: "D", value: "D", extension: ".d" },
          { label: "Go", value: "Go", extension: ".go" },
          { label: "Haskell", value: "Haskell", extension: ".hs" },
          { label: "Java", value: "Java", extension: ".java" },
          { label: "JavaScript", value: "JavaScript", extension: ".js" },
          { label: "Kotlin", value: "Kotlin", extension: ".kt" },
          { label: "OCaml", value: "OCaml", extension: ".ml" },
          { label: "Pascal", value: "Pascal", extension: ".pas" },
          { label: "Perl", value: "Perl", extension: ".pl" },
          { label: "PHP", value: "PHP", extension: ".php" },
          { label: "Python3", value: "Python3", extension: ".py" },
          { label: "Ruby", value: "Ruby", extension: ".rb" },
          { label: "Rust", value: "Rust", extension: ".rs" },
          { label: "Scala", value: "Scala", extension: ".scala" },
        ];

        const config = vscode.workspace.getConfiguration("CPcodeforces");
        const preferredLanguage = config.get<string>("preferredCodingLanguage");
        const notifyPreferredLanguage = config.get<boolean>(
          "notifyPreferredLanguage"
        );

        this.recentProblemsProvider.addToRecent(problem);

        if (preferredLanguage) {
          const selectedLanguage = languages.find(
            (lang) => lang.value === preferredLanguage
          );
          if (selectedLanguage) {
            vscode.commands.executeCommand(
              "extension.createCodeFile",
              problem,
              selectedLanguage
            );
            return;
          }
        }

        const selectedLanguage = await vscode.window.showQuickPick(languages, {
          title: "Select a programming language",
          placeHolder: "Choose a language",
        });

        if (selectedLanguage) {
          vscode.commands.executeCommand(
            "extension.createCodeFile",
            problem,
            selectedLanguage
          );

          if (notifyPreferredLanguage) {
            const selectedOption = await vscode.window.showInformationMessage(
              "You haven't set your preferred coding language in the extension settings.",
              "Set it now",
              "Never remind me again"
            );

            if (selectedOption === "Set it now") {
              vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "CPcodeforces.preferredCodingLanguage"
              );
            } else if (selectedOption === "Never remind me again") {
              config.update("notifyPreferredLanguage", false, true);
            }

            return;
          }
        }
      }

      if (message.command === "submitSolution") {
        const problemIndex = message.problemIndex;
        const problemContestId = message.problemContestId;
        const problemCode = `${problemContestId}-${problemIndex}`;

        this.recentProblemsProvider.addToRecent(problem);

        vscode.env.openExternal(
          vscode.Uri.parse(
            `https://codeforces.com/problemset/submit?submittedProblemCode=${problemCode}`
          )
        );
      }
    });
  }

  async handleChanged(handle: string): Promise<boolean> {
    try {
      const submissions = await this.api.fetchUserSubmissions(handle);
      this.api.setSubmissions(submissions);

      vscode.commands.executeCommand("setContext", "codeforcesHandleSet", true);
      this.refresh();
      return true;
    } catch (error) {
      vscode.commands.executeCommand(
        "setContext",
        "codeforcesHandleSet",
        false
      );

      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      } else {
        vscode.window.showErrorMessage("Error fetching user submissions.");
      }
      return false;
    }
  }

  loadSortOrderFromSettings(): void {
    const config = vscode.workspace.getConfiguration("CPcodeforces");
    const sortOrder = config.get<string>("sortOrder");
    switch (sortOrder) {
      case "RatingAsc":
        this.sortOrder = SortOrder.RatingAsc;
        break;
      case "RatingDesc":
        this.sortOrder = SortOrder.RatingDesc;
        break;
      default:
        this.sortOrder = SortOrder.None;
    }
  }
}
