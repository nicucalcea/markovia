import * as vscode from 'vscode';
import * as path from 'path';
import { TodoItem, DateSection, TodoTreeItemType, getDateSectionInfo, getStartOfDay, formatDate } from './todoTypes';
import { TodoScanner } from './todoScanner';

/**
 * Tree item for the TODO panel
 */
class TodoTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly itemType: TodoTreeItemType,
		public readonly section?: DateSection,
		public readonly todo?: TodoItem
	) {
		super(label, collapsibleState);

		if (itemType === TodoTreeItemType.Section) {
			this.contextValue = 'todoSection';
			const sectionInfo = getDateSectionInfo(section!);
			this.iconPath = new vscode.ThemeIcon(sectionInfo.icon);
		} else if (itemType === TodoTreeItemType.Todo && todo) {
			this.contextValue = 'todoItem';
			this.iconPath = new vscode.ThemeIcon('circle-outline');
			this.command = {
				command: 'markovia.openTodoItem',
				title: 'Open TODO',
				arguments: [todo]
			};
			this.description = this.getRelativePath(todo.filePath);
			this.tooltip = this.buildTooltip(todo);
		}
	}

	private getRelativePath(filePath: string): string {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
		if (workspaceFolder) {
			return path.relative(workspaceFolder.uri.fsPath, filePath);
		}
		return path.basename(filePath);
	}

	private buildTooltip(todo: TodoItem): vscode.MarkdownString {
		const tooltip = new vscode.MarkdownString();
		tooltip.appendMarkdown(`**${todo.displayText}**\n\n`);
		tooltip.appendMarkdown(`📁 ${todo.filePath}\n\n`);
		tooltip.appendMarkdown(`📍 Line ${todo.lineNumber}\n\n`);
		if (todo.hasDate && todo.dueDate) {
			tooltip.appendMarkdown(`📅 Due: ${formatDate(todo.dueDate)}`);
		}
		return tooltip;
	}
}

/**
 * Provider for the TODO tree view
 */
export class TodoPanelProvider implements vscode.TreeDataProvider<TodoTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<TodoTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private todos: TodoItem[] = [];
	private scanner: TodoScanner;
	private isScanning = false;

	constructor() {
		this.scanner = new TodoScanner();
	}

	/**
	 * Refresh the tree
	 */
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Scan workspace and refresh
	 */
	async scan(): Promise<void> {
		if (this.isScanning) {
			return;
		}

		this.isScanning = true;
		try {
			this.todos = await this.scanner.scanWorkspace();
			this.refresh();
		} catch (error) {
			vscode.window.showErrorMessage('Markovia: Failed to scan workspace for TODOs');
		} finally {
			this.isScanning = false;
		}
	}

	/**
	 * Update a specific file
	 */
	updateFile(document: vscode.TextDocument): void {
		if (document.languageId !== 'markdown') {
			return;
		}

		// Remove existing todos from this file
		this.todos = this.todos.filter(todo => todo.uri.fsPath !== document.uri.fsPath);

		// Scan the document and add new todos
		const fileTodos = this.scanner.scanDocument(document);
		this.todos.push(...fileTodos);

		this.refresh();
	}

	/**
	 * Remove a file from the todo list
	 */
	removeFile(uri: vscode.Uri): void {
		const beforeCount = this.todos.length;
		this.todos = this.todos.filter(todo => todo.uri.fsPath !== uri.fsPath);
		
		if (this.todos.length !== beforeCount) {
			this.refresh();
		}
	}

	/**
	 * Get tree item
	 */
	getTreeItem(element: TodoTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children
	 */
	getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
		if (!element) {
			// Root level - return date sections
			return Promise.resolve(this.getSectionItems());
		} else if (element.itemType === TodoTreeItemType.Section) {
			// Section level - return todos in this section
			return Promise.resolve(this.getTodosForSection(element.section!));
		}

		return Promise.resolve([]);
	}

	/**
	 * Get section items with counts
	 */
	private getSectionItems(): TodoTreeItem[] {
		const grouped = this.groupByDateSection();
		const sections: TodoTreeItem[] = [];

		for (const section of Object.values(DateSection)) {
			const todos = grouped.get(section) || [];
			if (todos.length === 0) {
				continue; // Hide empty sections
			}

			const sectionInfo = getDateSectionInfo(section);
			const label = `${sectionInfo.label} (${todos.length})`;
			const item = new TodoTreeItem(
				label,
				vscode.TreeItemCollapsibleState.Expanded,
				TodoTreeItemType.Section,
				section
			);
			sections.push(item);
		}

		// Sort by order
		sections.sort((a, b) => {
			const orderA = getDateSectionInfo(a.section!).order;
			const orderB = getDateSectionInfo(b.section!).order;
			return orderA - orderB;
		});

		return sections;
	}

	/**
	 * Get todos for a specific section
	 */
	private getTodosForSection(section: DateSection): TodoTreeItem[] {
		const grouped = this.groupByDateSection();
		const todos = grouped.get(section) || [];

		return todos.map(todo => {
			return new TodoTreeItem(
				todo.displayText,
				vscode.TreeItemCollapsibleState.None,
				TodoTreeItemType.Todo,
				undefined,
				todo
			);
		});
	}

	/**
	 * Group todos by date section
	 */
	private groupByDateSection(): Map<DateSection, TodoItem[]> {
		const grouped = new Map<DateSection, TodoItem[]>();
		const today = getStartOfDay(new Date());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const twoWeeksFromNow = new Date(today);
		twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

		// Initialize all sections
		for (const section of Object.values(DateSection)) {
			grouped.set(section, []);
		}

		for (const todo of this.todos) {
			if (!todo.hasDate || !todo.dueDate) {
				grouped.get(DateSection.NoDate)!.push(todo);
				continue;
			}

			const dueDate = getStartOfDay(todo.dueDate);

			if (dueDate < today) {
				grouped.get(DateSection.Overdue)!.push(todo);
			} else if (dueDate.getTime() === today.getTime()) {
				grouped.get(DateSection.Today)!.push(todo);
			} else if (dueDate.getTime() === tomorrow.getTime()) {
				grouped.get(DateSection.Tomorrow)!.push(todo);
			} else if (dueDate <= twoWeeksFromNow) {
				grouped.get(DateSection.NextTwoWeeks)!.push(todo);
			} else {
				grouped.get(DateSection.Later)!.push(todo);
			}
		}

		// Sort todos within each section by filename then line number
		for (const todos of grouped.values()) {
			todos.sort((a, b) => {
				const fileCompare = a.filePath.localeCompare(b.filePath);
				if (fileCompare !== 0) {
					return fileCompare;
				}
				return a.lineNumber - b.lineNumber;
			});
		}

		return grouped;
	}

	/**
	 * Get total count of todos
	 */
	getTodoCount(): number {
		return this.todos.length;
	}

	/**
	 * Get count of todos in a specific date section
	 */
	getTaskCountBySection(section: DateSection): number {
		const grouped = this.groupByDateSection();
		const todos = grouped.get(section) || [];
		return todos.length;
	}
}
