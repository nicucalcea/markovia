/**
 * Centralized regex patterns for task parsing and decoration
 * This ensures consistency across the codebase
 */

/**
 * Task checkbox patterns
 */
export const TASK_PATTERNS = {
	/** Matches uncompleted task: - [ ] or * [ ] or + [ ] */
	task: /^\s*[-*+]\s+\[\s\]\s+(.*)$/,
	/** Matches completed task: - [x] or * [x] or + [x] (case insensitive) */
	completedTask: /^\s*[-*+]\s+\[x\]\s+(.*)$/i,
} as const;

/**
 * Task metadata patterns
 */
export const METADATA_PATTERNS = {
	/** Matches date emoji with ISO date: 📅 2026-02-04 */
	date: /📅\s*(\d{4}-\d{2}-\d{2})/,
	/** 
	 * Matches recurrence emoji with pattern: 🔁 every day
	 * Using \uFE0F? to handle optional variation selector
	 * Captures text until another metadata emoji or end of line
	 * Supports recurrence appearing anywhere in the line
	 */
	recurrence: /🔁\uFE0F?\s*(.+?)(?=\s*[📅🏷️⏫⏬🔼🔽]|\s*$)/,
} as const;

/**
 * Combined patterns for convenience
 */
export const TODO_PATTERNS = {
	...TASK_PATTERNS,
	...METADATA_PATTERNS,
} as const;
