# README

A VSCode extension that enables users to view and solve Codeforces problems within VS Code.

# Demonstration

![demo](https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/c366caaa-32ad-4c99-82a6-da7d88a48fb6)

# Features

### Sign in with Codeforces handle

<img width="355" alt="enter-user-codeforces-handle-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/536142f3-a161-48fc-9262-1026ce385db9">

### Fetch user's solution status

<img width="360" alt="fetch-users-solution-status-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/2a7585cc-68a5-4091-87d7-db7ca6f3668c">

### Refetch user's solution status

<img width="411" alt="refresh-button-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/91be559c-8301-48f6-b541-1a1e6f53adab">

### Toggle problems' rating order

<img width="463" alt="toggle-rating-order-button-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/7a76c737-20af-44e8-8b75-14819b7ffbd1">

### Preview problems

<img width="1255" alt="preview-problems-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/708189a6-53c7-480f-8512-15d3446d6f49">

### Set preferred coding language

<img width="389" alt="set-preferred-coding-language-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/8fbec9cf-c55c-435b-a3ce-497608e856b3">

### Set template code to initialize the solution file

<img width="474" alt="set-template-code-to-initialize-the-solution-file-demo" src="https://github.com/Deep0Thinking/vscode-CP-codeforces/assets/103571424/d6e2a336-cd05-4d30-ae74-14f97b41376e">

# Requirements

- [VS Code 1.77.0+](https://code.visualstudio.com/updates/v1_77)

# Extension Settings

| Setting Name | Description | Default Value |
|--------------|-------------|---------------|
| `CPcodeforces.userHandle` | The last valid Codeforces user handle entered. | `""` |
| `CPcodeforces.defaultSolutionsFolderPath` | The absolute path for saving solutions. (Leave blank to use the default home path.) | `""` |
| `CPcodeforces.notifyPreferredLanguage` | Notify if the preferred coding language is not set. | `true` |
| `CPcodeforces.preferredCodingLanguage` | Preferred coding language for problem solutions. Supported languages: `C`, `C#`, `C++`, `D`, `Go`, `Haskell`, `Java`, `JavaScript`, `Kotlin`, `OCaml`, `Pascal`, `Perl`, `PHP`, `Python3`, `Ruby`, `Rust`, `Scala` | `""` |
| `CPcodeforces.notifySolutionTemplate` | Notify if the solution template is not set. | `true` |
| `CPcodeforces.solutionTemplate` | Template code for the solution file of the preferred language. | `""` |
| `CPcodeforces.sortOrder` | Sort order for the All problems list. Supported options: `"None"`, `"RatingAsc"`, `"RatingDesc` | `"None"` |
| `CPcodeforces.difficultySortOrder` | Sort order for the Difficulty folders list. Supported options: `"RatingAsc"`, `"RatingDesc"` | `"RatingAsc"` |



# Release Notes

Refer to [CHANGELOG](https://github.com/Deep0Thinking/vscode-CP-codeforces/blob/master/CHANGELOG.md)

# Attribution

The codeforces-icon used in this repository are from the [LibreICONS](https://github.com/DiemenDesign/LibreICONS) by [Dennis Suitters](https://github.com/DiemenDesign), and are licensed under the MIT License.

# License

MIT License

