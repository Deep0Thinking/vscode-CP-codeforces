import * as vscode from 'vscode';
import { CodeforcesApi } from './codeforcesApi';
import { AllProblemsProvider } from './treeViews/allProblemsProvider';
import { DifficultyProblemsProvider } from './treeViews/difficultyProblemsProvider';
import { TagsProblemsProvider } from './treeViews/tagsProblemsProvider';
import { CodeforcesProblem } from './models';
import { UserSubmissions } from './userSubmissions';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


enum SortOrder {
  None,
  RatingAsc,
  RatingDesc,
}

export function activate(context: vscode.ExtensionContext) {

  const api = new CodeforcesApi();

  const allProblemsProvider = new AllProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-all', allProblemsProvider);

  const difficultyProblemsProvider = new DifficultyProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-difficulty', difficultyProblemsProvider);

  const tagsProblemsProvider = new TagsProblemsProvider(api);
  vscode.window.registerTreeDataProvider('codeforces-problems-tags', tagsProblemsProvider);

  context.subscriptions.push(vscode.commands.registerCommand('codeforces.sortRatingAsc', async () => {
    await allProblemsProvider.sortProblems(SortOrder.RatingAsc);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('codeforces.sortRatingDesc', async () => {
    await allProblemsProvider.sortProblems(SortOrder.RatingDesc);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('codeforces.sortNone', async () => {
    await allProblemsProvider.sortProblems(SortOrder.None);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('codeforces.showSortOptions', async () => {
    const sortOptions = [
      { label: 'No Sorting', value: SortOrder.None },
      { label: 'Sort by Rating (Ascending)', value: SortOrder.RatingAsc },
      { label: 'Sort by Rating (Descending)', value: SortOrder.RatingDesc }
    ];

    const selectedOption = await vscode.window.showQuickPick(sortOptions, {
      title: 'Sort Problems',
      placeHolder: 'Choose a sorting option'
    });

    if (selectedOption) {
      await allProblemsProvider.sortProblems(selectedOption.value);
    }
  }));

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.showProblemDescription', async (problem: CodeforcesProblem) => {
      await allProblemsProvider.showProblemDescription(problem);
    }),
  );  

  context.subscriptions.push(
    vscode.commands.registerCommand('codeforces.refresh', () => {
      allProblemsProvider.refresh();
      difficultyProblemsProvider.refresh();
      tagsProblemsProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeforces.setUserHandle', async () => {
      const userHandle = await vscode.window.showInputBox({
        prompt: 'Enter your Codeforces handle',
      });
      if (userHandle) {
        try {
          const submissions = await api.fetchUserSubmissions(userHandle);
          UserSubmissions.set(userHandle, submissions);
          allProblemsProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage('Error fetching user submissions. Please check your handle and try again.');
        }
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeforces.enterHandle', async () => {
      const handle = await vscode.window.showInputBox({
        prompt: 'Enter your Codeforces handle',
      });

      if (handle) {
        context.globalState.update('codeforcesHandle', handle);
        vscode.window.showInformationMessage(`Codeforces handle set to: ${handle}`);
        allProblemsProvider.handleChanged(handle);
        difficultyProblemsProvider.handleChanged(handle);
        tagsProblemsProvider.handleChanged(handle);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.createCodeFile',
      async (problem: CodeforcesProblem, selectedLanguage: any) => {
        const solutionFolderName = 'vscode-CP-codeforces-problems-solutions';
        const solutionFileName = `${problem.contestId}-${problem.index}${selectedLanguage.extension}`;
        const rootPath = vscode.workspace.workspaceFolders
          ? vscode.workspace.workspaceFolders[0].uri.fsPath
          : os.homedir();
        const solutionFolderPath = path.join(rootPath, solutionFolderName);
  
        if (!fs.existsSync(solutionFolderPath)) {
          fs.mkdirSync(solutionFolderPath);
        }
  
        const solutionFilePath = path.join(solutionFolderPath, solutionFileName);
  
        if (!fs.existsSync(solutionFilePath)) {
          fs.writeFileSync(solutionFilePath, '');
        }
  
        const solutionFileUri = vscode.Uri.file(solutionFilePath);
        const solutionDocument = await vscode.workspace.openTextDocument(solutionFileUri);
        await vscode.window.showTextDocument(solutionDocument, { preview: false, viewColumn: vscode.ViewColumn.Two });

      }
    )
  );  

}

export function deactivate() { }
