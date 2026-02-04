import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { TodoItem, TODO_PATTERNS } from './todoTypes';
import { parseRecurrence } from './recurrence';

/**
 * Scanner for finding TODO items in markdown files
 * Uses ripgrep for workspace scanning and in-memory regex for open files
 */
export class TodoScanner {
	private rgPath: string | undefined;

	constructor() {
		this.rgPath = this.findRipgrep();
	}

	/**
	 * Find ripgrep binary bundled with VS Code
	 */
	private findRipgrep(): string | undefined {
		const exeName = process.platform === 'win32' ? 'rg.exe' : 'rg';
		
		const possiblePaths = [
			path.join(vscode.env.appRoot, 'node_modules/@vscode/ripgrep/bin/', exeName),
			path.join(vscode.env.appRoot, 'node_modules.asar.unpacked/@vscode/ripgrep/bin/', exeName),
			path.join(vscode.env.appRoot, 'node_modules/vscode-ripgrep/bin/', exeName),
			path.join(vscode.env.appRoot, 'node_modules.asar.unpacked/vscode-ripgrep/bin/', exeName),
		];
		
		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				return p;
			}
		}
		
		return undefined;
	}

	/**
	 * Scan workspace for TODO items using ripgrep
	 */
	async scanWorkspace(): Promise<TodoItem[]> {
		if (!this.rgPath) {
			return this.scanWorkspaceWithVSCode();
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return [];
		}

		const allTodos: TodoItem[] = [];

		for (const folder of workspaceFolders) {
			const todos = await this.scanFolderWithRipgrep(folder.uri.fsPath);
			allTodos.push(...todos);
		}

		return allTodos;
	}

	/**
	 * Scan a folder with ripgrep
	 */
	private scanFolderWithRipgrep(folderPath: string): Promise<TodoItem[]> {
		return new Promise((resolve, reject) => {
			// Pattern to match uncompleted tasks: - [ ] or * [ ] or + [ ]
			const pattern = '^\\s*[-*+]\\s+\\[\\s\\]\\s+';
			
			// Build ripgrep arguments
			const args = [
				'--no-messages',
				'--vimgrep',
				'-H',
				'--column',
				'--line-number',
				'--color', 'never',
				'-e', pattern,
				'-g', '*.md',
				'-g', '!node_modules',
				'-g', '!.git',
				'.'
			];

			const rgPath = this.rgPath!;
			
			execFile(rgPath, args, { cwd: folderPath, maxBuffer: 10 * 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
				// ripgrep returns exit code 1 when no matches found, which is not an error for us
				if (error && error.code !== 1) {
					console.error('Markovia: Ripgrep error:', stderr);
					resolve([]);
					return;
				}

				const todos = this.parseRipgrepOutput(stdout, folderPath);
				resolve(todos);
			});
		});
	}

	/**
	 * Parse ripgrep output into TodoItems
	 * Format: /path/to/file.md:12:5:- [ ] Task text
	 */
	private parseRipgrepOutput(output: string, basePath: string): TodoItem[] {
		if (!output || output.trim() === '') {
			return [];
		}

		const todos: TodoItem[] = [];
		const lines = output.trim().split('\n');

		for (const line of lines) {
			// Parse format: file:line:column:text
			const match = line.match(/^(.+):(\d+):(\d+):(.*)$/);
			if (!match) {
				continue;
			}

			const [, filePath, lineStr, columnStr, taskText] = match;
			const lineNumber = parseInt(lineStr, 10);
			const column = parseInt(columnStr, 10);

			// Resolve relative path to absolute path
			const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(basePath, filePath);
			
			const todo = this.parseTodoFromText(absolutePath, lineNumber, column, taskText);
			if (todo) {
				todos.push(todo);
			}
		}

		return todos;
	}

	/**
	 * Fallback: Scan workspace using VS Code's built-in findFiles
	 */
	private async scanWorkspaceWithVSCode(): Promise<TodoItem[]> {
		const files = await vscode.workspace.findFiles('**/*.md', '{**/node_modules/**,**/.git/**}');
		const todos: TodoItem[] = [];

		for (const fileUri of files) {
			try {
				const document = await vscode.workspace.openTextDocument(fileUri);
				const fileTodos = this.scanDocument(document);
				todos.push(...fileTodos);
			} catch (error) {
				console.error(`Markovia: Error reading file ${fileUri.fsPath}:`, error);
			}
		}

		return todos;
	}

	/**
	 * Scan a text document for TODO items (in-memory)
	 */
	scanDocument(document: vscode.TextDocument): TodoItem[] {
		const todos: TodoItem[] = [];
		const text = document.getText();
		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const lineText = lines[i];
			const match = TODO_PATTERNS.task.exec(lineText);
			
			if (match) {
				const column = lineText.indexOf('-');
				const todo = this.parseTodoFromText(
					document.uri.fsPath,
					i + 1, // VS Code uses 1-based line numbers
					column + 1, // 1-based column
					lineText
				);
				
				if (todo) {
					todos.push(todo);
				}
			}
		}

		return todos;
	}

	/**
	 * Parse a TODO item from task text
	 */
	private parseTodoFromText(
		filePath: string,
		lineNumber: number,
		column: number,
		taskText: string
	): TodoItem | null {
		const match = TODO_PATTERNS.task.exec(taskText);
		if (!match) {
			return null;
		}

		const content = match[1]; // Everything after "- [ ] "
		
		// Extract date if present
		const dateMatch = TODO_PATTERNS.date.exec(content);
		let dueDate: Date | undefined;
		let hasDate = false;
		let displayText = content.trim();

		if (dateMatch) {
			const dateStr = dateMatch[1];
			dueDate = new Date(dateStr);
			hasDate = true;
			
			// Remove date emoji and date from display text
			displayText = content.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').trim();
		}

		// Extract recurrence if present
		const recurrenceMatch = TODO_PATTERNS.recurrence.exec(content);
		let hasRecurrence = false;
		let recurrence = undefined;

		if (recurrenceMatch) {
			const recurrenceText = recurrenceMatch[1];
			const parsedRecurrence = parseRecurrence(recurrenceText);
			if (parsedRecurrence) {
				recurrence = parsedRecurrence;
				hasRecurrence = true;
				
				// Remove recurrence from display text
				displayText = displayText.replace(TODO_PATTERNS.recurrence, '').trim();
			}
		}

		return {
			filePath,
			uri: vscode.Uri.file(filePath),
			lineNumber,
			column,
			taskText: taskText.trim(),
			displayText,
			dueDate,
			hasDate,
			recurrence,
			hasRecurrence
		};
	}

	/**
	 * Check if ripgrep is available
	 */
	isRipgrepAvailable(): boolean {
		return this.rgPath !== undefined;
	}
}
