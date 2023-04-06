import * as vscode from 'vscode';
import { CodeforcesApi } from '../codeforcesApi';
import { CodeforcesProblem } from '../models';
import { ProblemTreeItem } from '../problemTreeItem';


// Provides the tree data for the "All Problems" view in the extension
export class AllProblemsProvider implements vscode.TreeDataProvider<CodeforcesProblem> {
  
  private api: CodeforcesApi;
  private currentPanel?: vscode.WebviewPanel;
  private _onDidChangeTreeData: vscode.EventEmitter<CodeforcesProblem | undefined | null | void> = new vscode.EventEmitter<CodeforcesProblem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CodeforcesProblem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(api: CodeforcesApi) {
    this.api = api;
  }

  // Refresh the tree view by firing the onDidChangeTreeData event
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // Get the tree item for the given problem
  getTreeItem(element: CodeforcesProblem): ProblemTreeItem {
    const treeItem = new ProblemTreeItem(element);
    treeItem.tooltip = treeItem.ratingTooltip;
    treeItem.command = {
      command: 'extension.showProblemDescription',
      title: 'Show Problem Description',
      arguments: [element],
    };
    return treeItem;
  }  

  // Get the children for the given element (if any)
  async getChildren(element?: CodeforcesProblem): Promise<CodeforcesProblem[]> {
    if (!element) {
      try {
        const problems = await this.api.getAllProblems();
        return problems;
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error fetching problems: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('Error fetching problems');
        }
        return [];
      }
    }
    return [];
  }

  // Show the problem description in a WebViewPanel
  async showProblemDescription(problem: CodeforcesProblem) {
    
    // Generate the problem URL
    const problemUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;
  
    // Fetch the problem description using progress notification
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

    
  
    // Dispose of the previous panel if it exists
    if (this.currentPanel) {
      this.currentPanel.dispose();
    }
  
    // Create a new panel and store a reference to it
    this.currentPanel = vscode.window.createWebviewPanel(
      'problemDescription',
      problem.name,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
  
    // Set the panel's content
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

      </style>

      <script>
        MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['$$$', '$$$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
          }
        };
      </script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

      
      <h1><a href="${problemUrl}" target="_blank">${problem.name}</a></h1>
      <h2>Rating: ${problem.rating}</h2>
      ${problemDescriptionHtml}
    `;
  
    // Dispose of the reference when the panel is closed
    this.currentPanel.onDidDispose(() => {
      this.currentPanel = undefined;
    });
  }  
  
}