import * as vscode from "vscode";
import { CodeforcesApi } from "./codeforcesApi";
import { AllProblemsProvider } from "./treeViews/allProblemsProvider";
import { DifficultyProblemsProvider } from "./treeViews/difficultyProblemsProvider";
import { TagsProblemsProvider } from "./treeViews/tagsProblemsProvider";
import { RecentProblemsProvider } from "./treeViews/recentProblemsProvider";
import { CodeforcesProblem } from "./models";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

enum SortOrder {
  None,
  RatingAsc,
  RatingDesc,
}

export async function activate(context: vscode.ExtensionContext) {
  const api = new CodeforcesApi();
  const recentProblemsProvider = new RecentProblemsProvider(api);
  recentProblemsProvider.setGlobalState(context.globalState);
  const allProblemsProvider = new AllProblemsProvider(
    api,
    recentProblemsProvider
  );
  const difficultyProblemsProvider = new DifficultyProblemsProvider(api);
  const tagsProblemsProvider = new TagsProblemsProvider(api);
  const config = vscode.workspace.getConfiguration("CPcodeforces");
  const storedHandle = config.get<string>("userHandle");

  if (storedHandle && storedHandle.trim() !== "") {
    const handleIsValid = await allProblemsProvider.handleChanged(storedHandle);
    if (handleIsValid) {
      vscode.commands.executeCommand("setContext", "codeforcesHandleSet", true);

      vscode.window.showInformationMessage(
        `You've signed in as [${storedHandle}]. [Change Handle](command:workbench.action.openSettings?%22CPcodeforces.userHandle%22)`
      );

      vscode.window.registerTreeDataProvider(
        "codeforces-problems-all",
        allProblemsProvider
      );
      vscode.window.registerTreeDataProvider(
        "codeforces-problems-difficulty",
        difficultyProblemsProvider
      );
      vscode.window.registerTreeDataProvider(
        "codeforces-problems-tags",
        tagsProblemsProvider
      );
      vscode.window.registerTreeDataProvider(
        "codeforces-problems-recent",
        recentProblemsProvider
      );
    } else {
      vscode.commands.executeCommand(
        "setContext",
        "codeforcesHandleSet",
        false
      );
    }
  } else {
    vscode.commands.executeCommand("setContext", "codeforcesHandleSet", false);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.sortRatingAsc", async () => {
      await allProblemsProvider.sortProblems(SortOrder.RatingAsc);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.sortRatingDesc", async () => {
      await allProblemsProvider.sortProblems(SortOrder.RatingDesc);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.sortNone", async () => {
      await allProblemsProvider.sortProblems(SortOrder.None);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.showSortOptions", async () => {
      const sortOptions = [
        { label: "No Sorting", value: SortOrder.None },
        { label: "Sort by Rating (Ascending)", value: SortOrder.RatingAsc },
        { label: "Sort by Rating (Descending)", value: SortOrder.RatingDesc },
      ];

      const selectedOption = await vscode.window.showQuickPick(sortOptions, {
        title: "Sort Problems",
        placeHolder: "Choose a sorting option",
      });

      if (selectedOption) {
        await allProblemsProvider.sortProblems(selectedOption.value);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.showProblemDescription",
      async (problem: CodeforcesProblem) => {
        await allProblemsProvider.showProblemDescription(problem);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.refresh", () => {
      allProblemsProvider.refresh();
      difficultyProblemsProvider.refresh();
      tagsProblemsProvider.refresh();
      recentProblemsProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforces.enterHandle", async () => {
      const handle = await vscode.window.showInputBox({
        prompt: "Enter your Codeforces handle",
      });

      if (handle) {
        const handleIsValid = await allProblemsProvider.handleChanged(handle);

        if (handleIsValid) {
          context.globalState.update("codeforcesHandle", handle);
          config.update("userHandle", handle, true);

          vscode.window.showInformationMessage(
            `Codeforces handle set to [${handle}]. [Change Handle](command:workbench.action.openSettings?%22CPcodeforces.userHandle%22)`
          );
          difficultyProblemsProvider.refresh();
          tagsProblemsProvider.refresh();
          recentProblemsProvider.refresh();

          vscode.window.registerTreeDataProvider(
            "codeforces-problems-all",
            allProblemsProvider
          );
          vscode.window.registerTreeDataProvider(
            "codeforces-problems-difficulty",
            difficultyProblemsProvider
          );
          vscode.window.registerTreeDataProvider(
            "codeforces-problems-tags",
            tagsProblemsProvider
          );
          vscode.window.registerTreeDataProvider(
            "codeforces-problems-recent",
            recentProblemsProvider
          );
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.createCodeFile",
      async (problem: CodeforcesProblem, selectedLanguage: any) => {
        const solutionFolderName = "vscode-CP-codeforces-problems-solutions";
        const solutionFileName = `${problem.contestId}-${problem.index}${selectedLanguage.extension}`;
        const config = vscode.workspace.getConfiguration("CPcodeforces");
        const solutionTemplate = config.get<string>("solutionTemplate");
        const notifySolutionTemplate = config.get<boolean>(
          "notifySolutionTemplate"
        );
        const userDefinedPath =
          config.get<string>("defaultSolutionsFolderPath") || "";
        const rootPath = userDefinedPath.trim()
          ? userDefinedPath
          : os.homedir();
        const solutionFolderPath = path.join(rootPath, solutionFolderName);

        if (!fs.existsSync(solutionFolderPath)) {
          fs.mkdirSync(solutionFolderPath);
        }

        const solutionFilePath = path.join(
          solutionFolderPath,
          solutionFileName
        );

        if (!fs.existsSync(solutionFilePath)) {
          fs.writeFileSync(solutionFilePath, solutionTemplate || "");
        }

        const solutionFileUri = vscode.Uri.file(solutionFilePath);
        const solutionDocument = await vscode.workspace.openTextDocument(
          solutionFileUri
        );
        await vscode.window.showTextDocument(solutionDocument, {
          preview: false,
          viewColumn: vscode.ViewColumn.Two,
        });

        if (!solutionTemplate && notifySolutionTemplate) {
          const selectedOption = await vscode.window.showInformationMessage(
            "You haven't set your solution template in the extension settings.",
            "Set it now",
            "Never remind me again"
          );

          if (selectedOption === "Set it now") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "CPcodeforces.solutionTemplate"
            );
          } else if (selectedOption === "Never remind me again") {
            config.update("notifySolutionTemplate", false, true);
          }
        }
      }
    )
  );

  vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration("CPcodeforces.userHandle")) {
      const newHandle = vscode.workspace
        .getConfiguration("CPcodeforces")
        .get<string>("userHandle");

      if (newHandle && newHandle.trim() !== "") {
        const handleIsValid = await allProblemsProvider.handleChanged(
          newHandle
        );
        if (handleIsValid) {
          vscode.commands.executeCommand(
            "setContext",
            "codeforcesHandleSet",
            true
          );

          vscode.window.showInformationMessage(
            `You've signed in as [${newHandle}]. [Change Handle](command:workbench.action.openSettings?%22CPcodeforces.userHandle%22)`
          );

          allProblemsProvider.refresh();
          difficultyProblemsProvider.refresh();
          tagsProblemsProvider.refresh();
          recentProblemsProvider.refresh();
        } else {
          vscode.commands.executeCommand(
            "setContext",
            "codeforcesHandleSet",
            false
          );
        }
      } else {
        vscode.commands.executeCommand(
          "setContext",
          "codeforcesHandleSet",
          false
        );
      }
    }

    if (e.affectsConfiguration("CPcodeforces.sortOrder")) {
      const newSortOrder = vscode.workspace
        .getConfiguration("CPcodeforces")
        .get<string>("sortOrder");

      switch (newSortOrder) {
        case "RatingAsc":
          await allProblemsProvider.sortProblems(SortOrder.RatingAsc);
          break;
        case "RatingDesc":
          await allProblemsProvider.sortProblems(SortOrder.RatingDesc);
          break;
        default:
          await allProblemsProvider.sortProblems(SortOrder.None);
      }
    }

    if (e.affectsConfiguration("CPcodeforces.difficultySortOrder")) {
      const newSortOrder = vscode.workspace
        .getConfiguration("CPcodeforces")
        .get<string>("difficultySortOrder");

      if (newSortOrder !== difficultyProblemsProvider.getSortOrder()) {
        difficultyProblemsProvider.toggleSortOrder();
      }
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeforces.toggleDifficultySortOrder",
      () => {
        difficultyProblemsProvider.toggleSortOrder();
      }
    )
  );
}

export function deactivate() {}
