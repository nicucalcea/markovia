# Markovia Agent Guidelines

This document provides essential information for AI agents contributing to the Markovia VS Code extension.

## Project Overview
Markovia is a lightweight Markdown editor for VS Code that provides WYSIWYG-style rendering and a formatting toolbar. It is written in TypeScript and uses VS Code's Decoration and CodeLens APIs.

## Development Commands

| Task | Command |
|------|---------|
| **Build** | `npm run compile` |
| **Watch** | `npm run watch` |
| **Lint** | `npm run lint` |
| **Test** | `npm run test` |
| **Single Test** | `npm test -- -g "Test Name"` |

**Note**: `npm run test` automatically triggers `compile` and `lint` via `pretest`.

## Code Style Guidelines

### Core Conventions
- **Indentation**: Use **Tabs** for all files (except JSON/Markdown).
- **Quotes**: Use **Single Quotes** (`'`) for strings. Use double quotes only when necessary.
- **Line Length**: Aim for ~100-120 characters, but prioritize readability.
- **Semicolons**: Always use semicolons.

### Naming Conventions
- **Classes/Interfaces**: `PascalCase` (e.g., `MarkdownDecorator`, `ToolbarProvider`).
- **Methods/Functions**: `camelCase` (e.g., `updateDecorations()`, `wrapSelection()`).
- **Variables/Properties**: `camelCase` (e.g., `statusBarItem`, `selection`).
- **Files**: `camelCase` for utilities, `PascalCase` sometimes for classes, but current project uses `camelCase` (e.g., `markdownDecorator.ts`).

### Types
- Use explicit types for function parameters and return values unless they are trivial or inferred correctly by TypeScript.
- Prefer `vscode.Range`, `vscode.Position`, and other built-in VS Code types for editor operations.
- Use `readonly` for properties that aren't intended to be modified after initialization.

### Imports
- Group imports:
	1. VS Code API (`import * as vscode from 'vscode';`)
	2. Other modules/libraries
	3. Local project files
- Use named imports for local files unless the module exports a single class.

### Error Handling
- Use `async/await` for asynchronous operations (e.g., `vscode.window.showInputBox`).
- Always check if `vscode.window.activeTextEditor` is defined before performing editor operations.
- Handle potential undefined returns from VS Code UI elements (InputBox, QuickPick).

## Architecture & APIs

### Decorations (`markdownDecorator.ts`)
The `MarkdownDecorator` class handles real-time styling of Markdown syntax. It uses `createTextEditorDecorationType` to define styles and `setDecorations` to apply them.
- **Opacity**: Deemphasize syntax markers (like `**`, `#`, `>`) using `opacity: '0.3'`.
- **Theme Colors**: Use `new vscode.ThemeColor('...')` to respect the user's color theme (e.g., `editor.inlineCodeBackground`).
- **Parsing**: The decorator uses Regex to find Markdown patterns. When adding new decorations, update `parseAndDecorate` and `parseInlineFormatting`.
- **Optimization**: Decorations are applied to the entire visible document. For very large files, this might need optimization.

### Toolbar (`toolbarProvider.ts`)
The toolbar is implemented as a `MarkdownToolbarProvider` which implements `vscode.CodeLensProvider`.
- It inserts "buttons" at the top of Markdown files (line 0, character 0).
- Buttons are actually `CodeLens` items with titles like "Bold", "Italic", etc.
- These items trigger commands registered in `extension.ts` (e.g., `markovia.toggleBold`).
- Use icons in titles: `$(bold) Bold`, `$(italic) Italic`, etc.
- Always check the `markovia.showToolbar` configuration before providing lenses.

### Commands & Editor Operations (`extension.ts`)
- **Selection Handling**: Use `editor.selection` to get the current user selection.
- **Editing**: Use `editor.edit(editBuilder => { ... })` for document modifications.
- **Wrapping Logic**: `wrapSelection` is a helper for toggleable markers (bold, italic, etc.). It checks if the selection is already wrapped and toggles it.
- **Inputs**: Use `vscode.window.showInputBox` for gathering user data (like URLs for links).
- **Clipboard**: Access clipboard via `vscode.env.clipboard.readText()`.

### Completion (`taskAutoSuggest.ts`)
- Implements `vscode.CompletionItemProvider`.
- Triggered by a space character after a checkbox (e.g., `- [ ] `).
- Offers quick suggestions for dates and common task prefixes.
- Common prefixes: `due:`, `priority:`, `tag:`.
- Includes a date picker command `markovia.showDatePicker`.

## Common VS Code API Usage
- `vscode.window.activeTextEditor`: The currently focused editor. Always null-check.
- `vscode.Range`: Represents a range in the document.
- `vscode.Position`: A specific line/character index.
- `context.subscriptions.push(...)`: Used for resource cleanup (disposing commands, providers, etc.).

## Testing Guidelines
- Tests are located in `src/test/` and run using `@vscode/test-cli`.
- Use the Mocha-style `suite` and `test` blocks.
- Use `assert` for assertions.
- **Running Tests**:
  - `npm test`: Runs all tests.
  - `npm test -- -g "suite name"`: Runs a specific suite.
  - `npm test -- -g "test name"`: Runs a specific test.
- When adding new features, add corresponding tests in `extension.test.ts` or create a new test file.
- Ensure `npm run lint` passes before submitting changes.
