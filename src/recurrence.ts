import { RRule, Frequency, Weekday, Options as RRuleOptions } from 'rrule';

/**
 * Represents a recurrence rule for recurring tasks
 * Compatible with Obsidian Tasks recurrence syntax
 */
export interface RecurrenceRule {
	/** The RRule instance for calculating occurrences */
	rrule: RRule | null;
	/** Whether to calculate next occurrence from completion date (true) or original date (false) */
	baseOnToday: boolean;
	/** The original recurrence text (e.g., "every Monday") */
	recurrenceText: string;
}

/**
 * Parse recurrence text into an RRule
 * Supports Obsidian Tasks natural language syntax like:
 * - "every day"
 * - "every week"
 * - "every Monday"
 * - "every 2 weeks"
 * - "every month"
 * - "every month on the 15th"
 * - "every year"
 * - "every Monday when done"
 */
export function parseRecurrence(recurrenceText: string): RecurrenceRule | null {
	if (!recurrenceText || recurrenceText.trim() === '') {
		return null;
	}

	// Check for "when done" suffix
	const whenDoneMatch = recurrenceText.match(/^(.+?)\s+when done$/i);
	const baseOnToday = whenDoneMatch !== null;
	const ruleText = baseOnToday ? whenDoneMatch![1] : recurrenceText;

	try {
		const rrule = parseRuleText(ruleText.trim());
		
		return {
			rrule,
			baseOnToday,
			recurrenceText: recurrenceText.trim()
		};
	} catch (error) {
		console.warn('Markovia: Failed to parse recurrence:', recurrenceText, error);
		return null;
	}
}

/**
 * Parse the rule text into an RRule instance
 */
function parseRuleText(ruleText: string): RRule | null {
	const lowerText = ruleText.toLowerCase();

	// Remove "every" prefix if present
	const text = lowerText.startsWith('every ') ? lowerText.substring(6) : lowerText;

	// Pattern: "N days/weeks/months/years" or just "day/week/month/year"
	const intervalMatch = text.match(/^(\d+)\s+(day|week|month|year)s?$/);
	if (intervalMatch) {
		const interval = parseInt(intervalMatch[1], 10);
		const unit = intervalMatch[2];
		return createRRule(getFrequency(unit), interval);
	}

	// Pattern: "day/week/month/year" (singular, interval = 1)
	const singleUnitMatch = text.match(/^(day|week|month|year)$/);
	if (singleUnitMatch) {
		const unit = singleUnitMatch[1];
		return createRRule(getFrequency(unit), 1);
	}

	// Pattern: "weekday" (Monday, Tuesday, etc.)
	const weekday = parseWeekday(text);
	if (weekday !== null) {
		return createRRule(Frequency.WEEKLY, 1, [weekday]);
	}

	// Pattern: "N weekdays" (e.g., "2 Mondays")
	const intervalWeekdayMatch = text.match(/^(\d+)\s+(.+)$/);
	if (intervalWeekdayMatch) {
		const interval = parseInt(intervalWeekdayMatch[1], 10);
		const weekdayText = intervalWeekdayMatch[2].replace(/s$/, ''); // Remove plural 's'
		const weekday = parseWeekday(weekdayText);
		if (weekday !== null) {
			return createRRule(Frequency.WEEKLY, interval, [weekday]);
		}
	}

	// Pattern: "weekday, weekday" (e.g., "Monday, Wednesday")
	if (text.includes(',')) {
		const parts = text.split(',').map(p => p.trim());
		const weekdays = parts.map(parseWeekday).filter(w => w !== null) as Weekday[];
		if (weekdays.length > 0) {
			return createRRule(Frequency.WEEKLY, 1, weekdays);
		}
	}

	// Pattern: "month on the Nth" (e.g., "month on the 15th")
	const monthDayMatch = text.match(/^month\s+on\s+the\s+(\d+)(?:st|nd|rd|th)?$/);
	if (monthDayMatch) {
		const dayOfMonth = parseInt(monthDayMatch[1], 10);
		return createRRule(Frequency.MONTHLY, 1, undefined, dayOfMonth);
	}

	// Pattern: "N months on the Nth"
	const intervalMonthDayMatch = text.match(/^(\d+)\s+months?\s+on\s+the\s+(\d+)(?:st|nd|rd|th)?$/);
	if (intervalMonthDayMatch) {
		const interval = parseInt(intervalMonthDayMatch[1], 10);
		const dayOfMonth = parseInt(intervalMonthDayMatch[2], 10);
		return createRRule(Frequency.MONTHLY, interval, undefined, dayOfMonth);
	}

	// If we can't parse it, return null
	console.warn('Markovia: Unable to parse recurrence pattern:', ruleText);
	return null;
}

/**
 * Create an RRule with given parameters
 */
function createRRule(
	freq: Frequency,
	interval: number = 1,
	byweekday?: Weekday[],
	bymonthday?: number
): RRule {
	const options: Partial<RRuleOptions> = {
		freq,
		interval,
	};

	if (byweekday) {
		options.byweekday = byweekday;
	}

	if (bymonthday) {
		options.bymonthday = bymonthday;
	}

	return new RRule(options as RRuleOptions);
}

/**
 * Get frequency from unit string
 */
function getFrequency(unit: string): Frequency {
	switch (unit.toLowerCase()) {
		case 'day':
			return Frequency.DAILY;
		case 'week':
			return Frequency.WEEKLY;
		case 'month':
			return Frequency.MONTHLY;
		case 'year':
			return Frequency.YEARLY;
		default:
			return Frequency.DAILY;
	}
}

/**
 * Parse weekday name into RRule Weekday
 */
function parseWeekday(text: string): Weekday | null {
	const lowerText = text.toLowerCase().trim();
	
	// Map of weekday names to RRule Weekday objects
	const weekdayMap: { [key: string]: Weekday } = {
		'monday': RRule.MO,
		'mon': RRule.MO,
		'tuesday': RRule.TU,
		'tue': RRule.TU,
		'wednesday': RRule.WE,
		'wed': RRule.WE,
		'thursday': RRule.TH,
		'thu': RRule.TH,
		'friday': RRule.FR,
		'fri': RRule.FR,
		'saturday': RRule.SA,
		'sat': RRule.SA,
		'sunday': RRule.SU,
		'sun': RRule.SU
	};

	return weekdayMap[lowerText] || null;
}

/**
 * Calculate the next occurrence date for a recurring task
 * @param recurrence The recurrence rule
 * @param referenceDate The date to calculate from (completion date or original due date)
 * @returns The next occurrence date, or null if calculation fails
 */
export function calculateNextOccurrence(
	recurrence: RecurrenceRule,
	referenceDate: Date
): Date | null {
	if (!recurrence.rrule) {
		return null;
	}

	try {
		// Get the next occurrence after the reference date
		// We need to get the date after referenceDate, not including it
		const nextDay = new Date(referenceDate);
		nextDay.setDate(nextDay.getDate() + 1);
		nextDay.setHours(0, 0, 0, 0);

		const nextDate = recurrence.rrule.after(nextDay, false);
		return nextDate;
	} catch (error) {
		console.error('Markovia: Failed to calculate next occurrence:', error);
		return null;
	}
}

/**
 * Format a date as YYYY-MM-DD (ISO date format used by Obsidian Tasks)
 */
export function formatDateForTask(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Calculate the offset in days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24;
	const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
	const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
	return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}
