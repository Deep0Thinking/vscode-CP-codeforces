import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CodeGenerator {
    static async createSolutionFile(contestId: number, index: string, language: string, extension: string) {
      const rootFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!rootFolder) {
        vscode.window.showErrorMessage('No workspace folder is opened.');
        return;
      }
  
      const solutionsFolder = path.join(rootFolder, 'vscode-CP-codeforces-problems-solutions');
      const solutionFilename = `${contestId}-${index}.${extension}`;
      const solutionPath = path.join(solutionsFolder, solutionFilename);
  
      if (!fs.existsSync(solutionsFolder)) {
        fs.mkdirSync(solutionsFolder);
      }
  
      if (!fs.existsSync(solutionPath)) {
        fs.writeFileSync(solutionPath, '');
      }
  
      const solutionUri = vscode.Uri.file(solutionPath);
      await vscode.window.showTextDocument(solutionUri);
    }
  }
  