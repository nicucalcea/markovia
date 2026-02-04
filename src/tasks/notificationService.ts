import * as vscode from 'vscode';
import * as path from 'path';
import { TodoPanelProvider } from './panel';
import { DateSection, buildTaskNotificationMessage } from './types';

// Dynamic import for node-notifier to handle module issues
const notifier = require('node-notifier');

/**
 * Service for showing notifications about overdue and today's tasks
 * Shows notifications on VS Code launch and daily at 9 AM (configurable)
 * Supports both system notifications and VS Code notifications
 */
export class TodoNotificationService implements vscode.Disposable {
	private readonly context: vscode.ExtensionContext;
	private readonly todoPanelProvider: TodoPanelProvider;
	private dailyCheckTimer?: NodeJS.Timeout;

	constructor(context: vscode.ExtensionContext, todoPanelProvider: TodoPanelProvider) {
		this.context = context;
		this.todoPanelProvider = todoPanelProvider;
	}

	/**
	 * Check tasks and show notification if needed
	 */
	async checkAndNotify(): Promise<void> {
		const config = vscode.workspace.getConfiguration('markovia');
		const notificationsEnabled = config.get<boolean>('todoPanel.notifications.enabled', true);

		if (!notificationsEnabled) {
			return;
		}

		const overdueCount = this.todoPanelProvider.getTaskCountBySection(DateSection.Overdue);
		const todayCount = this.todoPanelProvider.getTaskCountBySection(DateSection.Today);
		const totalCount = overdueCount + todayCount;

		if (totalCount > 0) {
			await this.showNotification(overdueCount, todayCount);
		}
	}

	/**
	 * Show notification with task counts
	 */
	private async showNotification(overdueCount: number, todayCount: number): Promise<void> {
		const config = vscode.workspace.getConfiguration('markovia');
		const useSystemNotifications = config.get<boolean>('todoPanel.notifications.useSystem', true);

		if (useSystemNotifications) {
			await this.showSystemNotification(overdueCount, todayCount);
		} else {
			await this.showVSCodeNotification(overdueCount, todayCount);
		}
	}

	/**
	 * Show native system notification
	 */
	private async showSystemNotification(overdueCount: number, todayCount: number): Promise<void> {
		const message = buildTaskNotificationMessage(overdueCount, todayCount);

		// Try to find VS Code icon for the notification
		let icon: string | undefined;
		try {
			// Use a default icon path or VS Code's icon
			icon = path.join(vscode.env.appRoot, 'resources', 'linux', 'code.png');
		} catch {
			icon = undefined;
		}

		// Show system notification with sticky/persistent behavior
		notifier.notify(
			{
				title: 'Markovia TODO Reminder',
				message: message,
				icon: icon,
				sound: true,
				wait: true, // Keep notification active (important for Linux)
				timeout: 0, // 0 = never expires (stays until user dismisses)
				urgency: 'critical', // Linux-specific: critical urgency makes it sticky in KDE
				hint: 'int:transient:0', // Linux-specific: 0 = persistent, 1 = transient
				category: 'reminder', // Helps KDE classify the notification
				actions: ['View Tasks', 'Dismiss'],
				closeLabel: 'Dismiss' // Label for close button
			},
			async (err: Error | null, response: any, metadata: any) => {
				if (err) {
					console.error('Markovia: System notification error:', err);
					// Fallback to VS Code notification
					await this.showVSCodeNotification(overdueCount, todayCount);
					return;
				}

				// Handle notification click (on supported platforms)
				if (metadata && metadata.activationValue === 'View Tasks') {
					await this.openTodoPanel();
				}
			}
		);

		// Also add a subtle VS Code notification for clickability
		// System notifications don't always support actions reliably
		const action = await vscode.window.showInformationMessage(
			message,
			{ modal: false },
			'View in Panel'
		);

		if (action === 'View in Panel') {
			await this.openTodoPanel();
		}
	}

	/**
	 * Show VS Code notification (fallback)
	 */
	private async showVSCodeNotification(overdueCount: number, todayCount: number): Promise<void> {
		const message = buildTaskNotificationMessage(overdueCount, todayCount);

		// Show notification with actions
		const action = await vscode.window.showInformationMessage(
			message,
			'View in Panel',
			'Dismiss'
		);

		if (action === 'View in Panel') {
			await this.openTodoPanel();
		}
	}

	/**
	 * Open and focus the TODO panel
	 */
	private async openTodoPanel(): Promise<void> {
		try {
			await vscode.commands.executeCommand('markoviaTodoPanel.focus');
		} catch (error) {
			console.error('Markovia: Failed to open TODO panel:', error);
		}
	}

	/**
	 * Schedule next daily check at configured time (default 9 AM)
	 */
	scheduleNextCheck(): void {
		// Clear existing timer
		if (this.dailyCheckTimer) {
			clearTimeout(this.dailyCheckTimer);
		}

		const config = vscode.workspace.getConfiguration('markovia');
		const timeString = config.get<string>('todoPanel.notifications.time', '09:00');
		
		// Parse time string (HH:MM format)
		const [hours, minutes] = timeString.split(':').map(Number);
		
		if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
			console.error('Markovia: Invalid notification time format. Using default 09:00');
			this.scheduleForTime(9, 0);
			return;
		}

		this.scheduleForTime(hours, minutes);
	}

	/**
	 * Schedule notification for specific time
	 */
	private scheduleForTime(hours: number, minutes: number): void {
		const now = new Date();
		const scheduledTime = new Date(now);
		scheduledTime.setHours(hours, minutes, 0, 0);

		// If the time has already passed today, schedule for tomorrow
		if (now.getTime() >= scheduledTime.getTime()) {
			scheduledTime.setDate(scheduledTime.getDate() + 1);
		}

		const msUntilScheduled = scheduledTime.getTime() - now.getTime();

		this.dailyCheckTimer = setTimeout(async () => {
			await this.checkAndNotify();
			// Schedule the next check for tomorrow
			this.scheduleNextCheck();
		}, msUntilScheduled);

		console.log(`Markovia: Next task notification scheduled for ${scheduledTime.toLocaleString()}`);
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		if (this.dailyCheckTimer) {
			clearTimeout(this.dailyCheckTimer);
		}
	}
}
