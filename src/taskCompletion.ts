import * as vscode from 'vscode';
import { TODO_PATTERNS } from './todoTypes';
import { parseRecurrence, calculateNextOccurrence, formatDateForTask, addDays, daysBetween } from './recurrence';

/**
 * Toggle task completion for the current line
 * If the task has a recurrence pattern, create a new task with the next occurrence
 */
export async function toggleTaskCompletion(editor: vscode.TextEditor): Promise<boolean> {
	const position = editor.selection.active;
	const line = editor.document.lineAt(position.line);
	const lineText = line.text;

	// Check if this is a task line
	const uncompletedMatch = TODO_PATTERNS.task.exec(lineText);
	const completedMatch = TODO_PATTERNS.completedTask.exec(lineText);

	if (!uncompletedMatch && !completedMatch) {
		return false; // Not a task line
	}

	const isCompleted = completedMatch !== null;

	if (isCompleted) {
		// Uncomplete the task: [x] -> [ ]
		await uncompleteTask(editor, line, lineText);
		return true;
	} else {
		// Complete the task: [ ] -> [x]
		await completeTask(editor, line, lineText, uncompletedMatch![1]);
		return true;
	}
}

/**
 * Mark a task as completed
 */
async function completeTask(
	editor: vscode.TextEditor,
	line: vscode.TextLine,
	lineText: string,
	taskContent: string
): Promise<void> {
	// Check if the task has a recurrence pattern
	const recurrenceMatch = TODO_PATTERNS.recurrence.exec(taskContent);
	const hasRecurrence = recurrenceMatch !== null;

	// Mark as completed by replacing [ ] with [x]
	const completedLine = lineText.replace(/\[\s\]/, '[x]');

	await editor.edit(editBuilder => {
		editBuilder.replace(line.range, completedLine);
	});

	// If task has recurrence, create the next occurrence
	if (hasRecurrence) {
		const recurrenceText = recurrenceMatch![1].trim();
		await createNextOccurrence(editor, line.lineNumber, lineText, taskContent, recurrenceText);
	}
}

/**
 * Mark a task as uncompleted
 */
async function uncompleteTask(
	editor: vscode.TextEditor,
	line: vscode.TextLine,
	lineText: string
): Promise<void> {
	// Replace [x] with [ ]
	const uncompletedLine = lineText.replace(/\[x\]/i, '[ ]');

	await editor.edit(editBuilder => {
		editBuilder.replace(line.range, uncompletedLine);
	});
}

/**
 * Create the next occurrence of a recurring task
 */
async function createNextOccurrence(
	editor: vscode.TextEditor,
	lineNumber: number,
	originalLineText: string,
	taskContent: string,
	recurrenceText: string
): Promise<void> {
	// Parse the recurrence rule
	const recurrence = parseRecurrence(recurrenceText);
	if (!recurrence || !recurrence.rrule) {
		vscode.window.showWarningMessage(`Markovia: Unable to parse recurrence pattern: ${recurrenceText}`);
		return;
	}

	// Determine the reference date for calculating the next occurrence
	const referenceDate = determineReferenceDate(taskContent, recurrence.baseOnToday);

	// Calculate the next occurrence
	const nextDate = calculateNextOccurrence(recurrence, referenceDate);
	if (!nextDate) {
		vscode.window.showWarningMessage('Markovia: Unable to calculate next occurrence for recurring task');
		return;
	}

	// Create the new task text with the updated date
	const newTaskText = createNewTaskText(originalLineText, taskContent, nextDate);

	// Insert the new task on the line immediately below the completed task
	const insertPosition = new vscode.Position(lineNumber + 1, 0);
	await editor.edit(editBuilder => {
		editBuilder.insert(insertPosition, newTaskText + '\n');
	});
}

/**
 * Determine the reference date for calculating the next occurrence
 * @param taskContent The task content
 * @param baseOnToday If true, use today's date; otherwise use the task's due date
 * @returns The reference date
 */
function determineReferenceDate(taskContent: string, baseOnToday: boolean): Date {
	if (baseOnToday) {
		// Use today as the reference date
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return today;
	}

	// Try to find a due date in the task content
	const dateMatch = TODO_PATTERNS.date.exec(taskContent);
	if (dateMatch) {
		const dateStr = dateMatch[1];
		const dueDate = new Date(dateStr);
		dueDate.setHours(0, 0, 0, 0);
		return dueDate;
	}

	// If no due date found, use today as fallback
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}

/**
 * Create the new task text with the updated date
 * @param originalLineText The original line text (with indentation and markers)
 * @param taskContent The task content (everything after "- [ ] ")
 * @param nextDate The next occurrence date
 * @returns The new task text
 */
function createNewTaskText(originalLineText: string, taskContent: string, nextDate: Date): string {
	// Preserve the indentation and list marker from the original line
	const indentMatch = originalLineText.match(/^(\s*)([-*+])\s+\[x\]\s+/i);
	if (!indentMatch) {
		// Fallback if regex doesn't match
		return `- [ ] ${updateTaskContentWithDate(taskContent, nextDate)}`;
	}

	const indent = indentMatch[1];
	const marker = indentMatch[2];

	// Create new uncompleted task with updated date
	return `${indent}${marker} [ ] ${updateTaskContentWithDate(taskContent, nextDate)}`;
}

/**
 * Update the task content with the new date
 * @param taskContent The original task content
 * @param nextDate The next occurrence date
 * @returns Updated task content
 */
function updateTaskContentWithDate(taskContent: string, nextDate: Date): string {
	const formattedDate = formatDateForTask(nextDate);

	// Check if the task already has a date
	const dateMatch = TODO_PATTERNS.date.exec(taskContent);
	if (dateMatch) {
		// Replace the existing date
		return taskContent.replace(TODO_PATTERNS.date, `📅 ${formattedDate}`);
	} else {
		// Add a date before the recurrence pattern
		// Find the recurrence pattern position
		const recurrenceMatch = TODO_PATTERNS.recurrence.exec(taskContent);
		if (recurrenceMatch) {
			// Insert date before recurrence pattern
			const beforeRecurrence = taskContent.substring(0, recurrenceMatch.index).trim();
			const recurrencePart = taskContent.substring(recurrenceMatch.index);
			return `${beforeRecurrence} 📅 ${formattedDate} ${recurrencePart}`;
		} else {
			// No recurrence pattern found (shouldn't happen, but handle gracefully)
			return `${taskContent} 📅 ${formattedDate}`;
		}
	}
}

/**
 * Check if the current line is a task
 */
export function isTaskLine(lineText: string): boolean {
	return TODO_PATTERNS.task.test(lineText) || TODO_PATTERNS.completedTask.test(lineText);
}

/**
 * Check if the current line is an uncompleted task
 */
export function isUncompletedTask(lineText: string): boolean {
	return TODO_PATTERNS.task.test(lineText);
}

/**
 * Check if the current line is a completed task
 */
export function isCompletedTask(lineText: string): boolean {
	return TODO_PATTERNS.completedTask.test(lineText);
}
