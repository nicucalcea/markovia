import * as vscode from 'vscode';

/**
 * Provides auto-suggest completion for task items similar to Obsidian Tasks
 * Triggers when user types in a task line (- [ ])
 */
export class TaskAutoSuggestProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		const lineText = document.lineAt(position.line).text;
		const textBeforeCursor = lineText.substring(0, position.character);

		// Check if we're in a task line (- [ ] or * [ ] or + [ ])
		const taskPattern = /^\s*[-*+]\s+\[\s*\]\s+/;
		if (!taskPattern.test(textBeforeCursor)) {
			return undefined;
		}

		const completions: vscode.CompletionItem[] = [];

		// Only add date emoji suggestion if date hasn't been added yet
		const hasDate = lineText.includes('📅');
		if (!hasDate) {
			const dateCompletion = this.createDateCompletion();
			completions.push(dateCompletion);
		}

		// Only add priority emoji suggestions if priority hasn't been added yet
		const hasPriority = lineText.includes('🔼') || lineText.includes('🔽') || 
		                    lineText.includes('⏫') || lineText.includes('⏬');
		if (!hasPriority) {
			const priorityCompletions = this.createPriorityCompletions();
			completions.push(...priorityCompletions);
		}

		return completions;
	}

	/**
	 * Creates the date emoji completion item with date suggestions
	 */
	private createDateCompletion(): vscode.CompletionItem {
		const completion = new vscode.CompletionItem('📅 Date', vscode.CompletionItemKind.Event);
		completion.detail = 'Add a date to this task';
		completion.documentation = new vscode.MarkdownString('Insert a date emoji and select from common date options');
		completion.insertText = '📅 ';
		completion.sortText = '0'; // Ensure it appears first
		
		// Add command to show date picker after insertion
		completion.command = {
			command: 'markovia.showDatePicker',
			title: 'Show Date Picker'
		};

		return completion;
	}

	/**
	 * Creates priority emoji completion items
	 */
	private createPriorityCompletions(): vscode.CompletionItem[] {
		const priorities = [
			{ emoji: '🔼', label: 'High Priority', detail: 'Mark as high priority', sortText: '1' },
			{ emoji: '🔽', label: 'Low Priority', detail: 'Mark as low priority', sortText: '2' },
			{ emoji: '⏫', label: 'Highest Priority', detail: 'Mark as highest priority', sortText: '3' },
			{ emoji: '⏬', label: 'Lowest Priority', detail: 'Mark as lowest priority', sortText: '4' },
		];

		return priorities.map(priority => {
			const completion = new vscode.CompletionItem(
				`${priority.emoji} ${priority.label}`,
				vscode.CompletionItemKind.Value
			);
			completion.detail = priority.detail;
			completion.insertText = `${priority.emoji} `;
			completion.sortText = priority.sortText;
			return completion;
		});
	}
}

/**
 * Shows a quick pick menu with common date options
 */
export async function showDatePicker() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const dateOptions = getDateOptions();
	const selected = await vscode.window.showQuickPick(dateOptions, {
		placeHolder: 'Select a date'
	});

	if (selected) {
		const position = editor.selection.active;
		editor.edit(editBuilder => {
			editBuilder.insert(position, selected.date);
		});
	}
}

/**
 * Generates common date options similar to Obsidian Tasks
 */
function getDateOptions(): Array<{ label: string; description: string; date: string }> {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	// Find next Monday
	const nextMonday = new Date(today);
	const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
	nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);

	// Find next Friday
	const nextFriday = new Date(today);
	const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7 || 7;
	nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);

	// Next week (7 days from today)
	const nextWeek = new Date(today);
	nextWeek.setDate(nextWeek.getDate() + 7);

	// Next month (30 days from today)
	const nextMonth = new Date(today);
	nextMonth.setDate(nextMonth.getDate() + 30);

	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const getWeekdayName = (date: Date): string => {
		return date.toLocaleDateString('en-US', { weekday: 'long' });
	};

	return [
		{
			label: 'Today',
			description: formatDate(today),
			date: formatDate(today)
		},
		{
			label: 'Tomorrow',
			description: formatDate(tomorrow),
			date: formatDate(tomorrow)
		},
		{
			label: `Next Monday (${getWeekdayName(nextMonday)})`,
			description: formatDate(nextMonday),
			date: formatDate(nextMonday)
		},
		{
			label: `Next Friday (${getWeekdayName(nextFriday)})`,
			description: formatDate(nextFriday),
			date: formatDate(nextFriday)
		},
		{
			label: 'Next week',
			description: formatDate(nextWeek),
			date: formatDate(nextWeek)
		},
		{
			label: 'Next month',
			description: formatDate(nextMonth),
			date: formatDate(nextMonth)
		}
	];
}
