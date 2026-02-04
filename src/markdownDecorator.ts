import * as vscode from 'vscode';
import { METADATA_PATTERNS } from './tasks/patterns';

export class MarkdownDecorator {
	private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
	
	constructor() {
		this.createDecorationTypes();
	}

	private createDecorationTypes() {
		// Heading decorations - increased font size using letter-spacing hack, syntax deemphasized
		// Note: VS Code doesn't support fontSize directly, so we use transform scaling
		this.decorationTypes.set('h1-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
			letterSpacing: '0.5px',
		}));
		
		this.decorationTypes.set('h1-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		this.decorationTypes.set('h2-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
			letterSpacing: '0.3px',
		}));
		
		this.decorationTypes.set('h2-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		this.decorationTypes.set('h3-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
			letterSpacing: '0.2px',
		}));
		
		this.decorationTypes.set('h3-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		this.decorationTypes.set('h4-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
		}));
		
		this.decorationTypes.set('h4-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		this.decorationTypes.set('h5-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
		}));
		
		this.decorationTypes.set('h5-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		this.decorationTypes.set('h6-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
		}));
		
		this.decorationTypes.set('h6-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Bold - actual bold text with deemphasized markers
		this.decorationTypes.set('bold-content', vscode.window.createTextEditorDecorationType({
			fontWeight: 'bold',
		}));
		
		this.decorationTypes.set('bold-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Italic - actual italic text with deemphasized markers
		this.decorationTypes.set('italic-content', vscode.window.createTextEditorDecorationType({
			fontStyle: 'italic',
		}));
		
		this.decorationTypes.set('italic-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Strikethrough
		this.decorationTypes.set('strikethrough-content', vscode.window.createTextEditorDecorationType({
			textDecoration: 'line-through',
		}));
		
		this.decorationTypes.set('strikethrough-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Underline
		this.decorationTypes.set('underline-content', vscode.window.createTextEditorDecorationType({
			textDecoration: 'underline',
		}));
		
		this.decorationTypes.set('underline-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Inline code - with background
		this.decorationTypes.set('code-content', vscode.window.createTextEditorDecorationType({
			backgroundColor: new vscode.ThemeColor('editor.inlineCodeBackground'),
			borderRadius: '3px',
		}));
		
		this.decorationTypes.set('code-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Links - visible text, deemphasized URL
		this.decorationTypes.set('link-text', vscode.window.createTextEditorDecorationType({
			color: new vscode.ThemeColor('textLink.foreground'),
			textDecoration: 'underline',
		}));
		
		this.decorationTypes.set('link-syntax', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));
		
		this.decorationTypes.set('link-url', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
			fontStyle: 'italic',
		}));

		// Lists - deemphasized markers
		this.decorationTypes.set('list-marker', vscode.window.createTextEditorDecorationType({
			opacity: '0.4',
		}));

		// Blockquote
		this.decorationTypes.set('blockquote-marker', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));
		
		this.decorationTypes.set('blockquote-content', vscode.window.createTextEditorDecorationType({
			fontStyle: 'italic',
			opacity: '0.9',
		}));

		// // Code blocks
		// this.decorationTypes.set('codeblock-fence', vscode.window.createTextEditorDecorationType({
		// 	opacity: '0.3',
		// }));
		
		// this.decorationTypes.set('codeblock-content', vscode.window.createTextEditorDecorationType({
		// 	backgroundColor: new vscode.ThemeColor('textCodeBlock.background'),
		// }));

		// Horizontal rule
		this.decorationTypes.set('hr', vscode.window.createTextEditorDecorationType({
			opacity: '0.3',
		}));

		// Task metadata emojis (date, recurrence, priority)
		this.decorationTypes.set('task-emoji', vscode.window.createTextEditorDecorationType({
			opacity: '0.8',
		}));
		
		// Recurrence pattern text
		this.decorationTypes.set('recurrence-text', vscode.window.createTextEditorDecorationType({
			opacity: '0.6',
			fontStyle: 'italic',
		}));
	}

	public updateDecorations(editor: vscode.TextEditor) {
		if (editor.document.languageId !== 'markdown') {
			return;
		}

		const text = editor.document.getText();
		const decorations: Map<string, vscode.DecorationOptions[]> = new Map();

		// Initialize decoration arrays
		for (const key of this.decorationTypes.keys()) {
			decorations.set(key, []);
		}

		this.parseAndDecorate(editor.document, text, decorations);

		// Apply all decorations
		for (const [key, decorationType] of this.decorationTypes) {
			const ranges = decorations.get(key) || [];
			editor.setDecorations(decorationType, ranges);
		}
	}

	private parseAndDecorate(
		document: vscode.TextDocument,
		text: string,
		decorations: Map<string, vscode.DecorationOptions[]>
	) {
		const lines = text.split('\n');
		let inCodeBlock = false;
		let codeBlockStart = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineStart = document.positionAt(text.split('\n').slice(0, i).join('\n').length + (i > 0 ? 1 : 0));

			// Code blocks
			if (line.match(/^```/)) {
				const range = new vscode.Range(lineStart, new vscode.Position(lineStart.line, line.length));
				decorations.get('codeblock-fence')?.push({ range });
				
				if (inCodeBlock) {
					// End of code block
					inCodeBlock = false;
				} else {
					// Start of code block
					inCodeBlock = true;
					codeBlockStart = i;
				}
				continue;
			}

			if (inCodeBlock) {
				const range = new vscode.Range(lineStart, new vscode.Position(lineStart.line, line.length));
				decorations.get('codeblock-content')?.push({ range });
				continue;
			}

			// Headings
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				const syntaxEnd = headingMatch[1].length + 1; // Include the space
				const contentStart = syntaxEnd;

				// Syntax (# symbols and space)
				const syntaxRange = new vscode.Range(
					lineStart,
					new vscode.Position(lineStart.line, syntaxEnd)
				);
				decorations.get(`h${level}-syntax`)?.push({ range: syntaxRange });

				// Content
				const contentRange = new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, line.length)
				);
				decorations.get(`h${level}-content`)?.push({ range: contentRange });
				continue;
			}

			// Horizontal rule
			if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
				const range = new vscode.Range(lineStart, new vscode.Position(lineStart.line, line.length));
				decorations.get('hr')?.push({ range });
				continue;
			}

			// Blockquote
			const blockquoteMatch = line.match(/^>\s?(.*)$/);
			if (blockquoteMatch) {
				const markerEnd = line.indexOf('>') + 1 + (line[line.indexOf('>') + 1] === ' ' ? 1 : 0);
				
				const markerRange = new vscode.Range(
					lineStart,
					new vscode.Position(lineStart.line, markerEnd)
				);
				decorations.get('blockquote-marker')?.push({ range: markerRange });

				if (blockquoteMatch[1]) {
					const contentRange = new vscode.Range(
						new vscode.Position(lineStart.line, markerEnd),
						new vscode.Position(lineStart.line, line.length)
					);
					decorations.get('blockquote-content')?.push({ range: contentRange });
				}
			}

			// Task markers: - [ ] or - [x]
			const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+/);
			if (taskMatch) {
				const markerStart = taskMatch[1].length;
				const markerEnd = taskMatch[0].length;
				
				const markerRange = new vscode.Range(
					new vscode.Position(lineStart.line, markerStart),
					new vscode.Position(lineStart.line, markerEnd)
				);
				decorations.get('list-marker')?.push({ range: markerRange });

				if (taskMatch[3].toLowerCase() === 'x') {
					const contentRange = new vscode.Range(
						new vscode.Position(lineStart.line, markerEnd),
						new vscode.Position(lineStart.line, line.length)
					);
					decorations.get('strikethrough-content')?.push({ range: contentRange });
				}
				
				this.parseInlineFormatting(lineStart, line, decorations);
				continue;
			}

			// List markers
			const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
			if (listMatch) {
				const markerStart = listMatch[1].length;
				const markerEnd = markerStart + listMatch[2].length + 1; // Include space
				
				const markerRange = new vscode.Range(
					new vscode.Position(lineStart.line, markerStart),
					new vscode.Position(lineStart.line, markerEnd)
				);
				decorations.get('list-marker')?.push({ range: markerRange });
			}

			// Inline formatting (process entire line)
			this.parseInlineFormatting(lineStart, line, decorations);
		}
	}

	private parseInlineFormatting(
		lineStart: vscode.Position,
		line: string,
		decorations: Map<string, vscode.DecorationOptions[]>
	) {
		// Track ranges that should be excluded from italic/bold parsing (e.g., inside links)
		const excludedRanges: Array<{start: number, end: number}> = [];

		// Links: [text](url)
		const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
		let match;
		while ((match = linkRegex.exec(line)) !== null) {
			const fullStart = match.index;
			const fullEnd = match.index + match[0].length;
			const textStart = fullStart + 1;
			const textEnd = textStart + match[1].length;
			const urlStart = textEnd + 2; // ](
			const urlEnd = urlStart + match[2].length;

			// Exclude the entire link from other formatting
			excludedRanges.push({start: fullStart, end: fullEnd});

			// Opening bracket
			decorations.get('link-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, textStart)
				)
			});

			// Link text
			decorations.get('link-text')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, textStart),
					new vscode.Position(lineStart.line, textEnd)
				)
			});

			// Middle syntax ](
			decorations.get('link-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, textEnd),
					new vscode.Position(lineStart.line, urlStart)
				)
			});

			// URL
			decorations.get('link-url')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, urlStart),
					new vscode.Position(lineStart.line, urlEnd)
				)
			});

			// Closing paren
			decorations.get('link-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, urlEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Helper function to check if a range overlaps with excluded ranges
		const isExcluded = (start: number, end: number): boolean => {
			return excludedRanges.some(excluded => 
				(start >= excluded.start && start < excluded.end) ||
				(end > excluded.start && end <= excluded.end) ||
				(start <= excluded.start && end >= excluded.end)
			);
		};

		// Bold: **text** or __text__
		const boldRegex = /(\*\*|__)([^*_]+)\1/g;
		while ((match = boldRegex.exec(line)) !== null) {
			const syntaxLen = match[1].length;
			const fullStart = match.index;
			const contentStart = fullStart + syntaxLen;
			const contentEnd = contentStart + match[2].length;
			const fullEnd = match.index + match[0].length;

			// Skip if inside a link or other excluded range
			if (isExcluded(fullStart, fullEnd)) {
				continue;
			}

			// Opening syntax
			decorations.get('bold-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, contentStart)
				)
			});

			// Content
			decorations.get('bold-content')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, contentEnd)
				)
			});

			// Closing syntax
			decorations.get('bold-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Italic: *text* or _text_ (but not part of bold)
		const italicRegex = /(?<!\*)\*(?!\*)([^*]+)\*(?!\*)|(?<!_)_(?!_)([^_]+)_(?!_)/g;
		while ((match = italicRegex.exec(line)) !== null) {
			const fullStart = match.index;
			const contentStart = fullStart + 1;
			const content = match[1] || match[2];
			const contentEnd = contentStart + content.length;
			const fullEnd = match.index + match[0].length;

			// Skip if inside a link or other excluded range
			if (isExcluded(fullStart, fullEnd)) {
				continue;
			}

			// Opening syntax
			decorations.get('italic-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, contentStart)
				)
			});

			// Content
			decorations.get('italic-content')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, contentEnd)
				)
			});

			// Closing syntax
			decorations.get('italic-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Strikethrough: ~~text~~
		const strikeRegex = /~~([^~]+)~~/g;
		while ((match = strikeRegex.exec(line)) !== null) {
			const fullStart = match.index;
			const contentStart = fullStart + 2;
			const contentEnd = contentStart + match[1].length;
			const fullEnd = match.index + match[0].length;

			decorations.get('strikethrough-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, contentStart)
				)
			});

			decorations.get('strikethrough-content')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, contentEnd)
				)
			});

			decorations.get('strikethrough-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Underline: <u>text</u>
		const underlineRegex = /<u>([^<]+)<\/u>/g;
		while ((match = underlineRegex.exec(line)) !== null) {
			const fullStart = match.index;
			const contentStart = fullStart + 3; // <u>
			const contentEnd = contentStart + match[1].length;
			const fullEnd = match.index + match[0].length;

			decorations.get('underline-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, contentStart)
				)
			});

			decorations.get('underline-content')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, contentEnd)
				)
			});

			decorations.get('underline-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Inline code: `code`
		const codeRegex = /`([^`]+)`/g;
		while ((match = codeRegex.exec(line)) !== null) {
			const fullStart = match.index;
			const contentStart = fullStart + 1;
			const contentEnd = contentStart + match[1].length;
			const fullEnd = match.index + match[0].length;

			decorations.get('code-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, fullStart),
					new vscode.Position(lineStart.line, contentStart)
				)
			});

			decorations.get('code-content')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentStart),
					new vscode.Position(lineStart.line, contentEnd)
				)
			});

			decorations.get('code-syntax')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, contentEnd),
					new vscode.Position(lineStart.line, fullEnd)
				)
			});
		}

		// Task metadata: Date emoji (📅) and recurrence emoji (🔁)
		const dateEmojiRegex = /📅/g;
		while ((match = dateEmojiRegex.exec(line)) !== null) {
			const emojiPos = match.index;
			decorations.get('task-emoji')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, emojiPos),
					new vscode.Position(lineStart.line, emojiPos + 1)
				)
			});
		}

		// Recurrence pattern: 🔁 followed by text (not anchored to end of line)
		// Use a lookahead to not consume the trailing space or end
		const recurrenceMatch = METADATA_PATTERNS.recurrence.exec(line);
		if (recurrenceMatch) {
			const emojiPos = recurrenceMatch.index;
			const patternStart = emojiPos + (recurrenceMatch[0].length - recurrenceMatch[1].length);
			const patternEnd = emojiPos + recurrenceMatch[0].length;

			// Style the emoji
			decorations.get('task-emoji')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, emojiPos),
					new vscode.Position(lineStart.line, patternStart)
				)
			});

			// Style the recurrence pattern text
			decorations.get('recurrence-text')?.push({
				range: new vscode.Range(
					new vscode.Position(lineStart.line, patternStart),
					new vscode.Position(lineStart.line, patternEnd)
				)
			});
		}
	}

	public dispose() {
		for (const decorationType of this.decorationTypes.values()) {
			decorationType.dispose();
		}
		this.decorationTypes.clear();
	}
}
