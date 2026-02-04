import * as vscode from 'vscode';
import { RecurrenceRule } from './recurrence';

/**
 * Represents a single TODO item found in a markdown file
 */
export interface TodoItem {
	/** Full file system path */
	filePath: string;
	/** URI of the file */
	uri: vscode.Uri;
	/** Line number (1-based) */
	lineNumber: number;
	/** Column number (1-based) */
	column: number;
	/** Full task text including markers */
	taskText: string;
	/** Display text without date emoji and date */
	displayText: string;
	/** Parsed due date (if present) */
	dueDate?: Date;
	/** Whether the task has a date */
	hasDate: boolean;
	/** Recurrence rule (if present) */
	recurrence?: RecurrenceRule;
	/** Whether the task has a recurrence pattern */
	hasRecurrence: boolean;
}

/**
 * Date sections for grouping TODOs
 */
export enum DateSection {
	Overdue = 'overdue',
	Today = 'today',
	Tomorrow = 'tomorrow',
	NextTwoWeeks = 'nextTwoWeeks',
	Later = 'later',
	NoDate = 'noDate'
}

/**
 * Display information for date sections
 */
export interface DateSectionInfo {
	label: string;
	icon: string;
	order: number;
}

/**
 * Tree item types
 */
export enum TodoTreeItemType {
	Section = 'section',
	Todo = 'todo'
}

/**
 * Regex patterns for parsing TODO items
 */
export const TODO_PATTERNS = {
	task: /^\s*[-*+]\s+\[\s\]\s+(.*)$/,
	completedTask: /^\s*[-*+]\s+\[x\]\s+(.*)$/i,
	date: /📅\s*(\d{4}-\d{2}-\d{2})/,
	// Recurrence pattern: 🔁 followed by text until end of line
	// Using \uFE0F? to handle optional variation selector
	recurrence: /🔁\uFE0F?\s*([a-zA-Z0-9, !]+)$/
};

/**
 * Get date section info mapping
 */
export function getDateSectionInfo(section: DateSection): DateSectionInfo {
	const infoMap: Record<DateSection, DateSectionInfo> = {
		[DateSection.Overdue]: { label: 'Overdue', icon: 'warning', order: 1 },
		[DateSection.Today]: { label: 'Today', icon: 'calendar', order: 2 },
		[DateSection.Tomorrow]: { label: 'Tomorrow', icon: 'calendar', order: 3 },
		[DateSection.NextTwoWeeks]: { label: 'Next Two Weeks', icon: 'calendar', order: 4 },
		[DateSection.Later]: { label: 'Later', icon: 'clock', order: 5 },
		[DateSection.NoDate]: { label: 'No Due Date', icon: 'circle-outline', order: 6 }
	};
	return infoMap[section];
}

/**
 * Get start of day (midnight) for a date
 */
export function getStartOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', { 
		year: 'numeric', 
		month: 'short', 
		day: 'numeric' 
	});
}

/**
 * Build notification message for overdue and today's tasks
 */
export function buildTaskNotificationMessage(overdueCount: number, todayCount: number): string {
	const totalCount = overdueCount + todayCount;
	
	// Build message
	let message = `You have ${totalCount} task${totalCount === 1 ? '' : 's'} that need${totalCount === 1 ? 's' : ''} attention`;
	
	const parts: string[] = [];
	if (overdueCount > 0) {
		parts.push(`${overdueCount} overdue`);
	}
	if (todayCount > 0) {
		parts.push(`${todayCount} today`);
	}
	
	if (parts.length > 0) {
		message += ` (${parts.join(', ')})`;
	}

	return message;
}
