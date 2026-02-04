import * as vscode from 'vscode';
import { isUncompletedTask, isCompletedTask } from './taskCompletion';

/**
 * Provides CodeLens buttons for task completion
 * Shows a "Complete" button next to uncompleted tasks
 * Shows an "Undo" button next to completed tasks
 */
export class TaskCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {}

	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		if (document.languageId !== 'markdown') {
			return [];
		}

		const codeLenses: vscode.CodeLens[] = [];
		const text = document.getText();
		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const lineText = lines[i];
			const range = new vscode.Range(i, 0, i, lineText.length);

			if (isUncompletedTask(lineText)) {
				// Add "Complete" button for uncompleted tasks
				codeLenses.push(new vscode.CodeLens(range, {
					title: '✓ Complete',
					tooltip: 'Mark task as complete (Ctrl+Enter)',
					command: 'markovia.completeTaskAtLine',
					arguments: [i]
				}));
			} else if (isCompletedTask(lineText)) {
				// Add "Undo" button for completed tasks
				codeLenses.push(new vscode.CodeLens(range, {
					title: '↶ Undo',
					tooltip: 'Mark task as incomplete',
					command: 'markovia.completeTaskAtLine',
					arguments: [i]
				}));
			}
		}

		return codeLenses;
	}

	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}
