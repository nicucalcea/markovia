import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension('nicu-calcea.markovia');
		assert.ok(extension, 'Extension should be available for tests');

		await extension?.activate();
	});

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Enter continues unchecked task items', async () => {
		const editor = await openMarkdownEditor('- [ ] Buy milk');
		const endOfLine = editor.document.lineAt(0).text.length;
		editor.selection = new vscode.Selection(0, endOfLine, 0, endOfLine);

		await vscode.commands.executeCommand('markovia.onEnterKey');
		await waitForDocumentText(editor, '- [ ] Buy milk\n- [ ] ');

		assert.strictEqual(editor.document.getText(), '- [ ] Buy milk\n- [ ] ');
	});

	test('Enter continues checked task items as unchecked', async () => {
		const editor = await openMarkdownEditor('- [x] Ship release');
		const endOfLine = editor.document.lineAt(0).text.length;
		editor.selection = new vscode.Selection(0, endOfLine, 0, endOfLine);

		await vscode.commands.executeCommand('markovia.onEnterKey');
		await waitForDocumentText(editor, '- [x] Ship release\n- [ ] ');

		assert.strictEqual(editor.document.getText(), '- [x] Ship release\n- [ ] ');
	});
});

async function openMarkdownEditor(content: string): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument({
		language: 'markdown',
		content
	});

	return vscode.window.showTextDocument(document);
}

async function waitForDocumentText(editor: vscode.TextEditor, expected: string): Promise<void> {
	const timeoutMs = 5000;
	const pollMs = 25;
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		if (editor.document.getText() === expected) {
			return;
		}

		await new Promise(resolve => setTimeout(resolve, pollMs));
	}

	assert.strictEqual(editor.document.getText(), expected);
}
