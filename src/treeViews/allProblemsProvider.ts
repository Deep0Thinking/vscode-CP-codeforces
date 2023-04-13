import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';
import { UserSubmissions } from '../userSubmissions';
import { CodeGenerator } from '../codeGenerator';


type ProblemOrCategory = CodeforcesProblem | 'Passed' | 'Failed' | 'Never Submitted';

enum SortOrder {
  None,
  RatingAsc,
  RatingDesc,
}

export class AllProblemsProvider implements vscode.TreeDataProvider<ProblemOrCategory> {

  private api: CodeforcesApi;
  private currentPanel?: vscode.WebviewPanel;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | undefined | null | void> = this._onDidChangeTreeData.event;

  private sortOrder: SortOrder = SortOrder.None;

  private handle: string | undefined;

  async sortProblems(order: SortOrder) {
    this.sortOrder = order;
    this.refresh();
  }

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  private _passedProblems: CodeforcesProblem[] = [];
  private _failedProblems: CodeforcesProblem[] = [];
  private _neverSubmittedProblems: CodeforcesProblem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProblemOrCategory): vscode.TreeItem {
    if (element === 'Passed' || element === 'Failed' || element === 'Never Submitted') {
      return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.Expanded);
    }
    const problem = element as CodeforcesProblem;
    const latestVerdict = UserSubmissions.getLatestVerdict(problem.contestId, problem.index);
    const treeItem = new ProblemTreeItem(problem, latestVerdict);
    treeItem.tooltip = treeItem.ratingTooltip;
    treeItem.command = {
      command: 'extension.showProblemDescription',
      title: 'Show Problem Description',
      arguments: [problem],
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

  async getChildren(element?: ProblemOrCategory): Promise<ProblemOrCategory[] | null | undefined> {
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
        this._passedProblems = problems.filter(problem => UserSubmissions.getLatestVerdict(problem.contestId, problem.index) === 'OK');
        this._failedProblems = problems.filter(problem => {
          const latestVerdict = UserSubmissions.getLatestVerdict(problem.contestId, problem.index);
          return latestVerdict !== 'OK' && latestVerdict !== null;
        });
        this._neverSubmittedProblems = problems.filter(problem => UserSubmissions.getLatestVerdict(problem.contestId, problem.index) === null);
        return ['Passed', 'Failed', 'Never Submitted'];
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error fetching problems: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('Error fetching problems');
        }
        return undefined;
      }
    } else if (element === 'Passed') {
      return this._passedProblems;
    } else if (element === 'Failed') {
      return this._failedProblems;
    } else if (element === 'Never Submitted') {
      return this._neverSubmittedProblems;
    }
    return undefined;
  }

  async showProblemDescription(problem: CodeforcesProblem) {

    const problemUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

    const problemDescriptionHtml = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching the problem...',
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
      'problemDescription',
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

      </script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

      <body>
        <h1><a href="${problemUrl}" target="_blank">${problem.name}</a></h1>
        <h2>Rating: ${problem.rating}</h2>
        <hr>
        ${problemDescriptionHtml}
        <hr>
        <br><br><br><br>
        <button class="code-button" onclick="createCodeFile()">Code</button>
      </body>
    `;

    this.currentPanel.onDidDispose(() => {
      this.currentPanel = undefined;
    });

    this.currentPanel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'createCodeFile') {
        const languages = [
          { label: 'Python3', value: 'python3', extension: '.py' },
          { label: 'C++', value: 'cpp', extension: '.cpp' },
          { label: 'Haskell', value: 'haskell', extension: '.hs' },
          { label: 'Java', value: 'java', extension: '.java' },
          // other languages 
        ];
    
        const selectedLanguage = await vscode.window.showQuickPick(languages, {
          title: 'Select a programming language',
          placeHolder: 'Choose a language',
        });
    
        if (selectedLanguage) {
          vscode.commands.executeCommand('extension.createCodeFile', problem, selectedLanguage);
        }
      }
    });    

  }

  async handleChanged(handle: string) {
    this.handle = handle;
    const submissions = await UserSubmissions.fetchSubmissions(handle);
    UserSubmissions.setSubmissions(submissions);
    this.refresh();
  }

  async showLanguageOptions(contestId: number, index: string) {
    const languages = [
      { label: 'Python3', value: { language: 'python3', extension: 'py' } },
      { label: 'C++', value: { language: 'cpp', extension: 'cpp' } },
      { label: 'Haskell', value: { language: 'haskell', extension: 'hs' } },
      { label: 'Java', value: { language: 'java', extension: 'java' } },
      // other languages 
    ];
  
    const selectedLanguage = await vscode.window.showQuickPick(languages, {
      title: 'Select a language',
      placeHolder: 'Choose a programming language',
    });
  
    if (selectedLanguage) {
      await CodeGenerator.createSolutionFile(contestId, index, selectedLanguage.value.language, selectedLanguage.value.extension);
    }
  }
  
}