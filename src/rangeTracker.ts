import * as vscode from 'vscode';
import { LineRange } from './types/authorship';

/**
 * Adjust ranges based on a document edit
 */
export function adjustRanges(
	ranges: LineRange[],
	change: vscode.TextDocumentContentChangeEvent
): LineRange[] {
	if (ranges.length === 0) {
		return [];
	}

	// Calculate the change in terms of lines
	const startLine = change.range.start.line;
	const endLine = change.range.end.line;
	const newText = change.text;
	const newLineCount = newText.split('\n').length - 1;
	const linesDeleted = endLine - startLine;
	const linesDelta = newLineCount - linesDeleted;

	// Adjust each range
	const adjustedRanges: LineRange[] = [];

	for (const range of ranges) {
		let newRange = { ...range };

		if (startLine <= range.start) {
			// Change is before or at the start of the range
			if (endLine < range.start) {
				// Change is completely before the range - shift it
				newRange.start += linesDelta;
				newRange.end += linesDelta;
			} else if (endLine <= range.end) {
				// Change overlaps the start of the range
				if (startLine < range.start) {
					// Change starts before range
					newRange.start = startLine + newLineCount;
					newRange.end += linesDelta;
				} else {
					// Change starts within range
					newRange.end += linesDelta;
				}
			} else {
				// Change completely encompasses the range
				if (startLine <= range.start && endLine >= range.end) {
					// Range is completely deleted - skip it
					continue;
				}
			}
		} else if (startLine <= range.end) {
			// Change starts within the range
			if (endLine <= range.end) {
				// Change is completely within the range - extend end
				newRange.end += linesDelta;
			} else {
				// Change extends beyond the range - shrink to change start
				newRange.end = startLine;
			}
		}
		// else: Change is after the range - no adjustment needed

		// Validate the range
		if (newRange.start <= newRange.end && newRange.start >= 0) {
			adjustedRanges.push(newRange);
		}
	}

	// Merge overlapping or adjacent ranges
	return mergeRanges(adjustedRanges);
}

/**
 * Merge overlapping or adjacent ranges
 */
export function mergeRanges(ranges: LineRange[]): LineRange[] {
	if (ranges.length === 0) {
		return [];
	}

	// Sort ranges by start line
	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: LineRange[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		// Check if ranges overlap or are adjacent
		if (current.start <= last.end + 1) {
			// Merge by extending the end of the last range
			last.end = Math.max(last.end, current.end);
		} else {
			// No overlap - add as new range
			merged.push(current);
		}
	}

	return merged;
}

/**
 * Add a new range and merge with existing ranges
 */
export function addRange(ranges: LineRange[], newRange: LineRange): LineRange[] {
	return mergeRanges([...ranges, newRange]);
}

/**
 * Remove a range from existing ranges
 * This will split ranges if the removal is in the middle
 */
export function removeRange(ranges: LineRange[], removeRange: LineRange): LineRange[] {
	const result: LineRange[] = [];

	for (const range of ranges) {
		// Check if ranges overlap
		if (removeRange.end < range.start || removeRange.start > range.end) {
			// No overlap - keep the range as is
			result.push(range);
		} else {
			// Ranges overlap - need to split/trim
			if (removeRange.start > range.start) {
				// Keep the part before the removal
				result.push({
					start: range.start,
					end: Math.min(range.end, removeRange.start - 1)
				});
			}
			if (removeRange.end < range.end) {
				// Keep the part after the removal
				result.push({
					start: Math.max(range.start, removeRange.end + 1),
					end: range.end
				});
			}
		}
	}

	return result;
}

/**
 * Check if a line is within any of the ranges
 */
export function isLineInRanges(line: number, ranges: LineRange[]): boolean {
	return ranges.some(range => line >= range.start && line <= range.end);
}

/**
 * Get all lines that are in the ranges
 */
export function getLinesInRanges(ranges: LineRange[]): Set<number> {
	const lines = new Set<number>();
	
	for (const range of ranges) {
		for (let line = range.start; line <= range.end; line++) {
			lines.add(line);
		}
	}
	
	return lines;
}
