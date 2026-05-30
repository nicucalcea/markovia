import * as vscode from 'vscode';
import * as path from 'path';

const MARKOVIA_SUPPORTED_EXTENSIONS = new Set(['.md', '.svx']);

export function isMarkdownLikeDocument(document: vscode.TextDocument): boolean {
	if (document.languageId === 'markdown') {
		return true;
	}

	const extension = path.extname(document.fileName).toLowerCase();
	return MARKOVIA_SUPPORTED_EXTENSIONS.has(extension);
}

export function isMarkdownLikeEditor(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
	return editor !== undefined && isMarkdownLikeDocument(editor.document);
}
