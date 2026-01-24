import * as vscode from 'vscode';
import { AuthorshipData, LineRange } from './types/authorship';
import * as frontmatterParser from './frontmatterParser';
import * as rangeTracker from './rangeTracker';

/**
 * Manages authorship data for a document
 */
export class AuthorshipManager {
	private externalRanges: LineRange[] = [];
	private document: vscode.TextDocument;
	private saveTimeout: NodeJS.Timeout | null = null;
	private contentStartLine: number = 0; // Line where content starts (after frontmatter)

	constructor(document: vscode.TextDocument) {
		this.document = document;
		this.loadFromDocument();
	}

	/**
	 * Load authorship data from document frontmatter
	 */
	public loadFromDocument(): void {
		const result = frontmatterParser.extractFrontmatter(this.document);
		
		if (result) {
			this.contentStartLine = result.contentStartLine;
			const authorship = frontmatterParser.parseAuthorship(result.data);
			this.externalRanges = authorship.external;
		} else {
			this.contentStartLine = 0;
			this.externalRanges = [];
		}
	}

	/**
	 * Add a new external range (in absolute document coordinates)
	 */
	public addExternalRange(startLine: number, endLine: number): void {
		// Convert absolute line numbers to content-relative
		// (subtract current frontmatter offset)
		const adjustedStart = startLine - this.contentStartLine;
		const adjustedEnd = endLine - this.contentStartLine;

		const newRange: LineRange = {
			start: Math.max(0, adjustedStart),
			end: Math.max(0, adjustedEnd)
		};

		this.externalRanges = rangeTracker.addRange(this.externalRanges, newRange);
		this.scheduleSave();
	}

	/**
	 * Remove external marking from a range (in absolute document coordinates)
	 */
	public removeExternalRange(startLine: number, endLine: number): void {
		// Convert absolute line numbers to content-relative
		const adjustedStart = startLine - this.contentStartLine;
		const adjustedEnd = endLine - this.contentStartLine;
		
		const removeRange: LineRange = {
			start: Math.max(0, adjustedStart),
			end: Math.max(0, adjustedEnd)
		};

		this.externalRanges = rangeTracker.removeRange(this.externalRanges, removeRange);
		this.scheduleSave();
	}

	/**
	 * Get all external ranges (in absolute document coordinates)
	 */
	public getExternalRanges(): LineRange[] {
		// Convert content-relative ranges to absolute document coordinates
		return this.externalRanges.map(range => ({
			start: range.start + this.contentStartLine,
			end: range.end + this.contentStartLine
		}));
	}

	/**
	 * Update ranges after a document edit
	 */
	public updateRangesAfterEdit(change: vscode.TextDocumentContentChangeEvent): void {
		// Get current frontmatter info
		const frontmatterResult = frontmatterParser.extractFrontmatter(this.document);
		const oldContentStart = this.contentStartLine;
		const newContentStart = frontmatterResult?.contentStartLine || 0;
		
		// If change is in frontmatter area, reload from document
		if (change.range.start.line < oldContentStart) {
			this.loadFromDocument();
			return;
		}

		// Convert change to content-relative coordinates
		const contentRelativeChange = {
			...change,
			range: new vscode.Range(
				new vscode.Position(
					change.range.start.line - oldContentStart,
					change.range.start.character
				),
				new vscode.Position(
					change.range.end.line - oldContentStart,
					change.range.end.character
				)
			)
		};

		// Adjust ranges based on the edit (in content-relative coordinates)
		this.externalRanges = rangeTracker.adjustRanges(this.externalRanges, contentRelativeChange);
		
		// Update content start line
		this.contentStartLine = newContentStart;

		this.scheduleSave();
	}

	/**
	 * Check if a line is external (line number in absolute document coordinates)
	 */
	public isLineExternal(lineNumber: number): boolean {
		// Convert to content-relative
		const contentRelativeLine = lineNumber - this.contentStartLine;
		return rangeTracker.isLineInRanges(contentRelativeLine, this.externalRanges);
	}

	/**
	 * Get all external lines as a Set (in absolute document coordinates)
	 */
	public getExternalLines(): Set<number> {
		const contentRelativeLines = rangeTracker.getLinesInRanges(this.externalRanges);
		const absoluteLines = new Set<number>();
		
		// Convert content-relative lines to absolute document coordinates
		for (const line of contentRelativeLines) {
			absoluteLines.add(line + this.contentStartLine);
		}
		
		return absoluteLines;
	}

	/**
	 * Schedule a save to frontmatter (debounced)
	 */
	private scheduleSave(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => {
			this.saveToDocument();
		}, 2000); // 2 second debounce
	}

	/**
	 * Save authorship data to document frontmatter immediately
	 */
	public async saveToDocument(): Promise<void> {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		const authorship: AuthorshipData = {
			external: this.externalRanges
		};

		const newFrontmatter = frontmatterParser.updateFrontmatter(this.document, authorship);
		const existingFrontmatter = frontmatterParser.extractFrontmatter(this.document);

		// Get the document content
		const text = this.document.getText();
		const lines = text.split('\n');

		let newContent: string;
		if (existingFrontmatter) {
			// Replace existing frontmatter
			const contentLines = lines.slice(existingFrontmatter.contentStartLine);
			if (newFrontmatter) {
				newContent = `${newFrontmatter}\n${contentLines.join('\n')}`;
			} else {
				// Remove frontmatter entirely
				newContent = contentLines.join('\n');
			}
		} else {
			// Add new frontmatter
			if (newFrontmatter) {
				newContent = `${newFrontmatter}\n${text}`;
			} else {
				// No frontmatter needed
				return;
			}
		}

		// Apply the edit
		const edit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(
			new vscode.Position(0, 0),
			new vscode.Position(this.document.lineCount, 0)
		);
		edit.replace(this.document.uri, fullRange, newContent);
		await vscode.workspace.applyEdit(edit);
	}

	/**
	 * Force immediate save (e.g., on document save)
	 */
	public forceSave(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
			this.saveToDocument();
		}
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
	}
}
