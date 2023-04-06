import * as vscode from 'vscode';
import { CodeforcesApi } from './codeforcesApi';
import { AllProblemsProvider } from './treeViews/allProblemsProvider';
import { DifficultyProblemsProvider } from './treeViews/difficultyProblemsProvider';
import { TagsProblemsProvider } from './treeViews/tagsProblemsProvider';
import { CodeforcesProblem } from './models';


// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

  // Instantiate the Codeforces API
  const api = new CodeforcesApi();

  // Register the All Problems tree data provider
  const allProblemsProvider = new AllProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-all', allProblemsProvider);

  // Register the Difficulty Problems tree data provider
  const difficultyProblemsProvider = new DifficultyProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-difficulty', difficultyProblemsProvider);

  // Register the Tags Problems tree data provider
  const tagsProblemsProvider = new TagsProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-tags', tagsProblemsProvider);

  // Register the command for showing the problem description
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.showProblemDescription', async (problem: CodeforcesProblem) => {
      await allProblemsProvider.showProblemDescription(problem);
    }),
  );

  // Register the command for refreshing the tree views
  context.subscriptions.push(
    vscode.commands.registerCommand('codeforces.refresh', () => {
      allProblemsProvider.refresh();
      difficultyProblemsProvider.refresh();
      tagsProblemsProvider.refresh();
    }),
  );
  
}

// This method is called when the extension is deactivated
export function deactivate() {}
