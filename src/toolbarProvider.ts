import * as vscode from 'vscode';

export class MarkdownToolbarProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {}

	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		if (document.languageId !== 'markdown') {
			return [];
		}

		const config = vscode.workspace.getConfiguration('markovia');
		const showToolbar = config.get<boolean>('showToolbar', true);

		if (!showToolbar) {
			return [];
		}

		// Create a CodeLens at the very top of the document (line 0)
		const topOfDocument = new vscode.Range(0, 0, 0, 0);
		
		const toolbarButtons: vscode.CodeLens[] = [
			new vscode.CodeLens(topOfDocument, {
				title: '$(bold) Bold',
				tooltip: 'Bold (Ctrl+B)',
				command: 'markovia.toggleBold'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(italic) Italic',
				tooltip: 'Italic (Ctrl+I)',
				command: 'markovia.toggleItalic'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(code) Code',
				tooltip: 'Inline Code (Ctrl+`)',
				command: 'markovia.toggleCode'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(link) Link',
				tooltip: 'Insert Link (Ctrl+K)',
				command: 'markovia.insertLink'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(list-unordered) Bullet List',
				tooltip: 'Bullet List (Ctrl+Shift+8)',
				command: 'markovia.toggleBulletList'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(list-ordered) Numbered List',
				tooltip: 'Numbered List (Ctrl+Shift+7)',
				command: 'markovia.toggleNumberedList'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(quote) Quote',
				tooltip: 'Blockquote (Ctrl+Shift+9)',
				command: 'markovia.toggleBlockquote'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(file-code) Code Block',
				tooltip: 'Code Block (Ctrl+Shift+C)',
				command: 'markovia.insertCodeBlock'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(symbol-file) H1',
				tooltip: 'Heading 1 (Ctrl+Shift+1)',
				command: 'markovia.toggleHeading1'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(symbol-class) H2',
				tooltip: 'Heading 2 (Ctrl+Shift+2)',
				command: 'markovia.toggleHeading2'
			}),
			new vscode.CodeLens(topOfDocument, {
				title: '$(symbol-method) H3',
				tooltip: 'Heading 3 (Ctrl+Shift+3)',
				command: 'markovia.toggleHeading3'
			}),
		];

		return toolbarButtons;
	}

	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}
