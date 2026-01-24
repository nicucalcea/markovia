import * as vscode from 'vscode';
import { MarkdownDecorator } from './markdownDecorator';
import { MarkdownToolbarProvider } from './toolbarProvider';
import { AuthorshipManager } from './authorshipManager';

let decorator: MarkdownDecorator;
let toolbarProvider: MarkdownToolbarProvider;
let authorshipManagers: Map<string, AuthorshipManager> = new Map();

export function activate(context: vscode.ExtensionContext) {
	console.log('Markovia markdown editor is now active');

	// Initialize the WYSIWYG decorator
	decorator = new MarkdownDecorator();
	context.subscriptions.push({ dispose: () => decorator.dispose() });

	// Initialize the toolbar provider
	toolbarProvider = new MarkdownToolbarProvider();
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ language: 'markdown', scheme: 'file' },
			toolbarProvider
		)
	);

	// Register all formatting commands
	context.subscriptions.push(
		vscode.commands.registerCommand('markovia.toggleBold', () => wrapSelection('**', '**')),
		vscode.commands.registerCommand('markovia.toggleItalic', () => wrapSelection('*', '*')),
		vscode.commands.registerCommand('markovia.toggleStrikethrough', () => wrapSelection('~~', '~~')),
		vscode.commands.registerCommand('markovia.toggleCode', () => wrapSelection('`', '`')),
		vscode.commands.registerCommand('markovia.insertLink', insertLink),
		vscode.commands.registerCommand('markovia.insertImage', insertImage),
		vscode.commands.registerCommand('markovia.insertCodeBlock', insertCodeBlock),
		vscode.commands.registerCommand('markovia.toggleHeading1', () => toggleHeading(1)),
		vscode.commands.registerCommand('markovia.toggleHeading2', () => toggleHeading(2)),
		vscode.commands.registerCommand('markovia.toggleHeading3', () => toggleHeading(3)),
		vscode.commands.registerCommand('markovia.toggleHeading4', () => toggleHeading(4)),
		vscode.commands.registerCommand('markovia.toggleHeading5', () => toggleHeading(5)),
		vscode.commands.registerCommand('markovia.toggleHeading6', () => toggleHeading(6)),
		vscode.commands.registerCommand('markovia.toggleBulletList', () => toggleList('-')),
		vscode.commands.registerCommand('markovia.toggleNumberedList', () => toggleList('1.')),
		vscode.commands.registerCommand('markovia.toggleBlockquote', toggleBlockquote),
		vscode.commands.registerCommand('markovia.insertHorizontalRule', insertHorizontalRule),
		vscode.commands.registerCommand('markovia.toggleToolbar', toggleToolbar),
		// Authorship commands
		vscode.commands.registerCommand('markovia.pasteExternal', pasteExternal),
		vscode.commands.registerCommand('markovia.markAsExternal', markAsExternal),
		vscode.commands.registerCommand('markovia.markAsOwn', markAsOwn),
		vscode.commands.registerCommand('markovia.toggleAuthorshipView', toggleAuthorshipView)
	);

	// Update decorations when switching editors or editing
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				initAuthorshipManager(editor.document);
				updateDecorations(editor);
			}
		}),
		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				// Update authorship ranges based on changes
				const manager = getAuthorshipManager(event.document);
				if (manager) {
					for (const change of event.contentChanges) {
						manager.updateRangesAfterEdit(change);
					}
				}
				updateDecorations(editor);
			}
		}),
		vscode.workspace.onDidSaveTextDocument(document => {
			// Force save authorship data when document is saved
			const manager = getAuthorshipManager(document);
			if (manager) {
				manager.forceSave();
			}
		}),
		vscode.workspace.onDidCloseTextDocument(document => {
			// Clean up authorship manager
			const uri = document.uri.toString();
			const manager = authorshipManagers.get(uri);
			if (manager) {
				manager.dispose();
				authorshipManagers.delete(uri);
				decorator.removeAuthorshipManager(uri);
			}
		}),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('markovia.showToolbar')) {
				toolbarProvider.refresh();
			}
			if (e.affectsConfiguration('markovia.enableWYSIWYG') || 
			    e.affectsConfiguration('markovia.enableAuthorship') ||
			    e.affectsConfiguration('markovia.authorshipOpacity')) {
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					updateDecorations(editor);
				}
			}
		})
	);

	// Apply decorations to the current editor
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		initAuthorshipManager(editor.document);
		updateDecorations(editor);
	}

	// Initialize authorship managers for all open markdown documents
	vscode.workspace.textDocuments.forEach(document => {
		if (document.languageId === 'markdown') {
			initAuthorshipManager(document);
		}
	});
}

function initAuthorshipManager(document: vscode.TextDocument) {
	if (document.languageId !== 'markdown') {
		return;
	}

	const uri = document.uri.toString();
	if (!authorshipManagers.has(uri)) {
		const manager = new AuthorshipManager(document);
		authorshipManagers.set(uri, manager);
		decorator.setAuthorshipManager(uri, manager);
	}
}

function getAuthorshipManager(document: vscode.TextDocument): AuthorshipManager | undefined {
	return authorshipManagers.get(document.uri.toString());
}

function updateDecorations(editor: vscode.TextEditor) {
	const config = vscode.workspace.getConfiguration('markovia');
	const enableWYSIWYG = config.get<boolean>('enableWYSIWYG', true);
	
	if (enableWYSIWYG) {
		decorator.updateDecorations(editor);
	}
}

function toggleToolbar() {
	const config = vscode.workspace.getConfiguration('markovia');
	const currentValue = config.get<boolean>('showToolbar', true);
	config.update('showToolbar', !currentValue, vscode.ConfigurationTarget.Global);
}

function wrapSelection(before: string, after: string) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const text = editor.document.getText(selection);

	// Check if text is already wrapped
	const range = new vscode.Range(
		new vscode.Position(selection.start.line, Math.max(0, selection.start.character - before.length)),
		new vscode.Position(selection.end.line, selection.end.character + after.length)
	);
	const surroundingText = editor.document.getText(range);

	if (surroundingText.startsWith(before) && surroundingText.endsWith(after)) {
		// Unwrap
		editor.edit(editBuilder => {
			editBuilder.delete(new vscode.Range(
				new vscode.Position(selection.start.line, selection.start.character - before.length),
				selection.start
			));
			editBuilder.delete(new vscode.Range(
				selection.end,
				new vscode.Position(selection.end.line, selection.end.character + after.length)
			));
		});
	} else {
		// Wrap
		editor.edit(editBuilder => {
			editBuilder.replace(selection, `${before}${text}${after}`);
		}).then(() => {
			// Keep text selected
			if (text.length > 0) {
				const newStart = new vscode.Position(selection.start.line, selection.start.character + before.length);
				const newEnd = new vscode.Position(selection.end.line, selection.end.character + before.length);
				editor.selection = new vscode.Selection(newStart, newEnd);
			}
		});
	}
}

async function insertLink() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const text = editor.document.getText(selection);
	const linkText = text || 'link text';
	
	const url = await vscode.window.showInputBox({
		prompt: 'Enter URL',
		placeHolder: 'https://example.com'
	});

	if (url !== undefined) {
		editor.edit(editBuilder => {
			editBuilder.replace(selection, `[${linkText}](${url})`);
		});
	}
}

async function insertImage() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const text = editor.document.getText(selection);
	const altText = text || 'alt text';
	
	const url = await vscode.window.showInputBox({
		prompt: 'Enter image URL or path',
		placeHolder: 'https://example.com/image.png'
	});

	if (url !== undefined) {
		editor.edit(editBuilder => {
			editBuilder.replace(selection, `![${altText}](${url})`);
		});
	}
}

async function insertCodeBlock() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const text = editor.document.getText(selection);
	
	const language = await vscode.window.showInputBox({
		prompt: 'Enter language (optional)',
		placeHolder: 'javascript, python, etc.'
	});

	if (language !== undefined) {
		const code = text || 'code here';
		editor.edit(editBuilder => {
			editBuilder.replace(selection, `\`\`\`${language}\n${code}\n\`\`\``);
		});
	}
}

function toggleHeading(level: number) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const line = editor.document.lineAt(selection.start.line);
	const lineText = line.text;
	const headingPrefix = '#'.repeat(level) + ' ';

	// Check if line already has a heading
	const headingMatch = lineText.match(/^(#{1,6})\s/);
	
	if (headingMatch && headingMatch[1].length === level) {
		// Remove heading
		editor.edit(editBuilder => {
			const newText = lineText.replace(/^#{1,6}\s/, '');
			editBuilder.replace(line.range, newText);
		});
	} else if (headingMatch) {
		// Replace with different level
		editor.edit(editBuilder => {
			const newText = lineText.replace(/^#{1,6}\s/, headingPrefix);
			editBuilder.replace(line.range, newText);
		});
	} else {
		// Add heading
		editor.edit(editBuilder => {
			editBuilder.insert(new vscode.Position(line.lineNumber, 0), headingPrefix);
		});
	}
}

function toggleList(marker: string) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const startLine = selection.start.line;
	const endLine = selection.end.line;

	editor.edit(editBuilder => {
		for (let i = startLine; i <= endLine; i++) {
			const line = editor.document.lineAt(i);
			const lineText = line.text;
			const trimmedText = lineText.trimStart();
			const indent = lineText.length - trimmedText.length;

			// Check if line already has a list marker
			const bulletMatch = trimmedText.match(/^[-*+]\s/);
			const numberedMatch = trimmedText.match(/^\d+\.\s/);

			if (bulletMatch || numberedMatch) {
				// Remove list marker
				const newText = ' '.repeat(indent) + trimmedText.replace(/^([-*+]|\d+\.)\s/, '');
				editBuilder.replace(line.range, newText);
			} else if (trimmedText.length > 0) {
				// Add list marker
				const newText = ' '.repeat(indent) + marker + ' ' + trimmedText;
				editBuilder.replace(line.range, newText);
			}
		}
	});
}

function toggleBlockquote() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const startLine = selection.start.line;
	const endLine = selection.end.line;

	editor.edit(editBuilder => {
		for (let i = startLine; i <= endLine; i++) {
			const line = editor.document.lineAt(i);
			const lineText = line.text;

			if (lineText.trimStart().startsWith('> ')) {
				// Remove blockquote
				const newText = lineText.replace(/^\s*>\s?/, '');
				editBuilder.replace(line.range, newText);
			} else if (lineText.trim().length > 0) {
				// Add blockquote
				editBuilder.insert(new vscode.Position(i, 0), '> ');
			}
		}
	});
}

function insertHorizontalRule() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const position = editor.selection.active;
	editor.edit(editBuilder => {
		editBuilder.insert(position, '\n---\n');
	});
}

async function pasteExternal() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'markdown') {
		return;
	}

	// Read clipboard content
	const clipboardText = await vscode.env.clipboard.readText();
	if (!clipboardText) {
		vscode.window.showInformationMessage('Clipboard is empty');
		return;
	}

	const position = editor.selection.active;
	const startLine = position.line;
	
	// Insert the text
	await editor.edit(editBuilder => {
		editBuilder.insert(position, clipboardText);
	});

	// Calculate end line
	const newLineCount = clipboardText.split('\n').length - 1;
	const endLine = startLine + newLineCount;

	// Mark as external
	const manager = getAuthorshipManager(editor.document);
	if (manager) {
		manager.addExternalRange(startLine, endLine);
		updateDecorations(editor);
	}
}

function markAsExternal() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'markdown') {
		return;
	}

	const selection = editor.selection;
	const startLine = selection.start.line;
	const endLine = selection.end.line;

	const manager = getAuthorshipManager(editor.document);
	if (manager) {
		manager.addExternalRange(startLine, endLine);
		updateDecorations(editor);
		vscode.window.showInformationMessage('Marked as external content');
	}
}

function markAsOwn() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'markdown') {
		return;
	}

	const selection = editor.selection;
	const startLine = selection.start.line;
	const endLine = selection.end.line;

	const manager = getAuthorshipManager(editor.document);
	if (manager) {
		manager.removeExternalRange(startLine, endLine);
		updateDecorations(editor);
		vscode.window.showInformationMessage('Marked as own content');
	}
}

function toggleAuthorshipView() {
	const config = vscode.workspace.getConfiguration('markovia');
	const currentValue = config.get<boolean>('enableAuthorship', true);
	config.update('enableAuthorship', !currentValue, vscode.ConfigurationTarget.Global);
}

export function deactivate() {
	// Cleanup handled by context.subscriptions
}
