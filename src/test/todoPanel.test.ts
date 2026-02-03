import * as assert from 'assert';
import * as vscode from 'vscode';
import { TodoScanner } from '../todoScanner';
import { DateSection } from '../todoTypes';

suite('TODO Panel Test Suite', () => {
	vscode.window.showInformationMessage('Start TODO panel tests.');

	test('TodoScanner should parse task with date', () => {
		const scanner = new TodoScanner();
		
		// Create a mock document
		const text = '- [ ] Buy groceries 📅 2025-02-10\n- [ ] Call dentist 📅 2025-02-04';
		const mockDoc = {
			uri: vscode.Uri.file('/test/file.md'),
			languageId: 'markdown',
			getText: () => text,
			lineCount: 2,
			lineAt: (line: number) => ({
				text: text.split('\n')[line]
			})
		} as vscode.TextDocument;
		
		const todos = scanner.scanDocument(mockDoc);
		
		assert.strictEqual(todos.length, 2);
		assert.strictEqual(todos[0].displayText, 'Buy groceries');
		assert.strictEqual(todos[0].hasDate, true);
		assert.ok(todos[0].dueDate);
	});

	test('TodoScanner should parse task without date', () => {
		const scanner = new TodoScanner();
		
		const text = '- [ ] Some task without a date';
		const mockDoc = {
			uri: vscode.Uri.file('/test/file.md'),
			languageId: 'markdown',
			getText: () => text,
			lineCount: 1,
			lineAt: (line: number) => ({
				text: text
			})
		} as vscode.TextDocument;
		
		const todos = scanner.scanDocument(mockDoc);
		
		assert.strictEqual(todos.length, 1);
		assert.strictEqual(todos[0].displayText, 'Some task without a date');
		assert.strictEqual(todos[0].hasDate, false);
		assert.strictEqual(todos[0].dueDate, undefined);
	});

	test('TodoScanner should ignore completed tasks', () => {
		const scanner = new TodoScanner();
		
		const text = '- [x] Completed task\n- [ ] Incomplete task';
		const mockDoc = {
			uri: vscode.Uri.file('/test/file.md'),
			languageId: 'markdown',
			getText: () => text,
			lineCount: 2,
			lineAt: (line: number) => ({
				text: text.split('\n')[line]
			})
		} as vscode.TextDocument;
		
		const todos = scanner.scanDocument(mockDoc);
		
		// Should only find the incomplete task
		assert.strictEqual(todos.length, 1);
		assert.strictEqual(todos[0].displayText, 'Incomplete task');
	});

	test('TodoScanner should handle different list markers', () => {
		const scanner = new TodoScanner();
		
		const text = '- [ ] Dash task\n* [ ] Star task\n+ [ ] Plus task';
		const mockDoc = {
			uri: vscode.Uri.file('/test/file.md'),
			languageId: 'markdown',
			getText: () => text,
			lineCount: 3,
			lineAt: (line: number) => ({
				text: text.split('\n')[line]
			})
		} as vscode.TextDocument;
		
		const todos = scanner.scanDocument(mockDoc);
		
		assert.strictEqual(todos.length, 3);
		assert.strictEqual(todos[0].displayText, 'Dash task');
		assert.strictEqual(todos[1].displayText, 'Star task');
		assert.strictEqual(todos[2].displayText, 'Plus task');
	});

	test('Date parsing should handle valid dates', () => {
		const scanner = new TodoScanner();
		
		const text = '- [ ] Task 📅 2025-12-31';
		const mockDoc = {
			uri: vscode.Uri.file('/test/file.md'),
			languageId: 'markdown',
			getText: () => text,
			lineCount: 1,
			lineAt: (line: number) => ({
				text: text
			})
		} as vscode.TextDocument;
		
		const todos = scanner.scanDocument(mockDoc);
		
		assert.strictEqual(todos.length, 1);
		assert.ok(todos[0].dueDate);
		assert.strictEqual(todos[0].dueDate!.getFullYear(), 2025);
		assert.strictEqual(todos[0].dueDate!.getMonth(), 11); // December (0-indexed)
		assert.strictEqual(todos[0].dueDate!.getDate(), 31);
	});
});
