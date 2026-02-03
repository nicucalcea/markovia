import * as vscode from 'vscode';
import { MarkdownDecorator } from './markdownDecorator';
import { MarkdownToolbarProvider } from './toolbarProvider';
import { TaskAutoSuggestProvider, showDatePicker } from './taskAutoSuggest';
import { MarkdownPasteHandler } from './pasteHandler';
import { TodoPanelProvider } from './todoPanel';
import { TodoItem } from './todoTypes';
import { TodoNotificationService } from './todoNotificationService';

let decorator: MarkdownDecorator;
let toolbarProvider: MarkdownToolbarProvider;
let statusBarItem: vscode.StatusBarItem;
let todoPanelProvider: TodoPanelProvider;
let todoNotificationService: TodoNotificationService | undefined;

export async function activate(context: vscode.ExtensionContext) {
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

	// Register task auto-suggest completion provider
	const taskAutoSuggestProvider = new TaskAutoSuggestProvider();
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: 'markdown', scheme: 'file' },
			taskAutoSuggestProvider,
			' ' // Trigger on space after checkbox
		)
	);

	// Register paste handler to preserve Markdown formatting
	const pasteHandler = new MarkdownPasteHandler();
	context.subscriptions.push(
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'markdown', scheme: 'file' },
			pasteHandler,
			{ 
				pasteMimeTypes: ['text/html'],
				providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty]
			}
		)
	);

	// Initialize status bar item for word/character count
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100 // Priority - higher = more to the right
	);
	context.subscriptions.push(statusBarItem);

	// Initialize TODO panel
	const config = vscode.workspace.getConfiguration('markovia');
	const todoPanelEnabled = config.get<boolean>('todoPanel.enabled', true);
	
	if (todoPanelEnabled) {
		todoPanelProvider = new TodoPanelProvider();
		const todoTreeView = vscode.window.createTreeView('markoviaTodoPanel', {
			treeDataProvider: todoPanelProvider
		});
		context.subscriptions.push(todoTreeView);

		// Initial scan
		await todoPanelProvider.scan();

		// Initialize notification service
		todoNotificationService = new TodoNotificationService(context, todoPanelProvider);
		context.subscriptions.push(todoNotificationService);

		// Check and show notification on startup
		await todoNotificationService.checkAndNotify();

		// Schedule daily notifications at configured time
		todoNotificationService.scheduleNextCheck();

		// Register TODO panel commands
		context.subscriptions.push(
			vscode.commands.registerCommand('markovia.refreshTodoPanel', () => {
				todoPanelProvider.scan();
			}),
			vscode.commands.registerCommand('markovia.openTodoItem', (todo: TodoItem) => {
				openTodoItem(todo);
			})
		);

		// Watch for file changes
		context.subscriptions.push(
			vscode.workspace.onDidSaveTextDocument(document => {
				if (document.languageId === 'markdown') {
					todoPanelProvider.updateFile(document);
				}
			}),
			vscode.workspace.onDidDeleteFiles(event => {
				event.files.forEach(uri => {
					todoPanelProvider.removeFile(uri);
				});
			}),
			vscode.workspace.onDidCreateFiles(async () => {
				// Rescan on new file creation
				await todoPanelProvider.scan();
			})
		);
	}

	// Register all formatting commands
	context.subscriptions.push(
		vscode.commands.registerCommand('markovia.toggleBold', () => wrapSelection('**', '**')),
		vscode.commands.registerCommand('markovia.toggleItalic', () => wrapSelection('*', '*')),
		vscode.commands.registerCommand('markovia.toggleStrikethrough', () => wrapSelection('~~', '~~')),
		vscode.commands.registerCommand('markovia.toggleCode', () => wrapSelection('`', '`')),
		vscode.commands.registerCommand('markovia.toggleUnderline', () => wrapSelection('<u>', '</u>')),
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
		vscode.commands.registerCommand('markovia.showDatePicker', showDatePicker),
		vscode.commands.registerCommand('markovia.toggleComment', toggleComment),
		vscode.commands.registerCommand('markovia.onEnterKey', handleEnterKey)
	);

	// Update decorations when switching editors or editing
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				updateDecorations(editor);
				updateWordCount(editor);
			}
		}),
		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				updateDecorations(editor);
				updateWordCount(editor);
			}
		}),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('markovia.showToolbar')) {
				toolbarProvider.refresh();
			}
			if (e.affectsConfiguration('markovia.enableWYSIWYG')) {
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
		updateDecorations(editor);
		updateWordCount(editor);
	}
}

function updateDecorations(editor: vscode.TextEditor) {
	const config = vscode.workspace.getConfiguration('markovia');
	const enableWYSIWYG = config.get<boolean>('enableWYSIWYG', true);
	
	if (enableWYSIWYG) {
		decorator.updateDecorations(editor);
	}
}

function updateWordCount(editor: vscode.TextEditor | undefined) {
	if (!editor) {
		statusBarItem.hide();
		return;
	}

	// Only show for markdown files
	if (editor.document.languageId !== 'markdown') {
		statusBarItem.hide();
		return;
	}

	const text = editor.document.getText();
	
	// Remove HTML comments
	const textWithoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
	
	// Character count (excluding newlines)
	const charCount = textWithoutComments.replace(/\n/g, '').length;
	
	// Character count (excluding spaces and newlines)
	const charCountNoSpaces = textWithoutComments.replace(/\s/g, '').length;
	
	// Word count (split by whitespace, filter empty strings)
	const words = textWithoutComments.split(/\s+/).filter(word => word.length > 0);
	const wordCount = words.length;
	
	// Format numbers with thousands separators
	const formatNumber = (num: number): string => {
		return num.toLocaleString('en-US');
	};
	
	// Update status bar
	statusBarItem.text = `$(pencil) ${formatNumber(wordCount)} words, ${formatNumber(charCount)} chars`;
	statusBarItem.tooltip = `Words: ${formatNumber(wordCount)}\nCharacters: ${formatNumber(charCount)}\nCharacters (no spaces): ${formatNumber(charCountNoSpaces)}`;
	statusBarItem.show();
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
	
	// Check clipboard for a valid URL
	const clipboardText = await vscode.env.clipboard.readText();
	const urlRegex = /^https?:\/\/.+/i;
	let url: string | undefined;
	
	if (clipboardText && urlRegex.test(clipboardText.trim())) {
		// Valid URL found in clipboard, use it directly
		url = clipboardText.trim();
	} else {
		// No valid URL in clipboard, show input box
		url = await vscode.window.showInputBox({
			prompt: 'Enter URL',
			placeHolder: 'https://example.com'
		});
	}

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

function toggleComment() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const text = editor.document.getText(selection);
	
	// Check if selection spans multiple lines
	const isMultiLine = selection.start.line !== selection.end.line;
	
	// Check if selection is entire paragraph(s)
	const isEntireParagraph = isMultiLine || (
		selection.start.character === 0 && 
		(selection.end.character === editor.document.lineAt(selection.end.line).text.length ||
		selection.end.character === 0)
	);

	// Check if text is already commented
	const commentedInlinePattern = /^<!--\s*(.*?)\s*-->$/s;
	const commentedBlockPattern = /^<!--\n([\s\S]*?)\n-->$/;
	
	if (commentedInlinePattern.test(text) || commentedBlockPattern.test(text)) {
		// Uncomment - remove comment tags
		let unCommentedText = text;
		if (commentedBlockPattern.test(text)) {
			unCommentedText = text.replace(/^<!--\n/, '').replace(/\n-->$/, '');
		} else if (commentedInlinePattern.test(text)) {
			unCommentedText = text.replace(/^<!--\s*/, '').replace(/\s*-->$/, '');
		}
		
		editor.edit(editBuilder => {
			editBuilder.replace(selection, unCommentedText);
		});
	} else {
		// Comment - add comment tags
		let commentedText: string;
		
		if (isEntireParagraph) {
			// Block style: tags on separate lines
			commentedText = `<!--\n${text}\n-->`;
		} else {
			// Inline style: tags on same line
			commentedText = `<!-- ${text} -->`;
		}
		
		editor.edit(editBuilder => {
			editBuilder.replace(selection, commentedText);
		});
	}
}

async function handleEnterKey() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'markdown') {
		// Fall back to default enter behavior
		await vscode.commands.executeCommand('type', { text: '\n' });
		return;
	}

	const position = editor.selection.active;
	const line = editor.document.lineAt(position.line);
	const lineText = line.text;

	// Check for bullet list
	const bulletMatch = lineText.match(/^(\s*)([-*+])\s+(.*)$/);
	if (bulletMatch) {
		const [, indent, marker, content] = bulletMatch;
		
		// If content is empty, remove the bullet point
		if (!content.trim()) {
			await editor.edit(editBuilder => {
				editBuilder.delete(line.range);
			});
			return;
		}

		// Insert new bullet point
		await editor.edit(editBuilder => {
			editBuilder.insert(position, `\n${indent}${marker} `);
		});
		return;
	}

	// Check for ordered list
	const numberedMatch = lineText.match(/^(\s*)(\d+)\.\s+(.*)$/);
	if (numberedMatch) {
		const [, indent, number, content] = numberedMatch;
		
		// If content is empty, remove the numbered list item
		if (!content.trim()) {
			await editor.edit(editBuilder => {
				editBuilder.delete(line.range);
			});
			return;
		}

		// Insert new numbered list item with incremented number
		const nextNumber = parseInt(number) + 1;
		await editor.edit(editBuilder => {
			editBuilder.insert(position, `\n${indent}${nextNumber}. `);
		});
		return;
	}

	// Default behavior - just insert a newline
	await vscode.commands.executeCommand('type', { text: '\n' });
}

/**
 * Open a TODO item in the editor
 */
async function openTodoItem(todo: TodoItem) {
	try {
		const document = await vscode.workspace.openTextDocument(todo.uri);
		const editor = await vscode.window.showTextDocument(document);
		
		// Navigate to the line
		const position = new vscode.Position(todo.lineNumber - 1, 0);
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(
			new vscode.Range(position, position),
			vscode.TextEditorRevealType.InCenter
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open TODO item: ${error}`);
	}
}

export function deactivate() {
	// Cleanup handled by context.subscriptions
}
