import * as vscode from 'vscode';

/**
 * Handles paste events to preserve Markdown-compatible formatting
 * (bold text, hyperlinks) when pasting HTML content.
 */
export class MarkdownPasteHandler implements vscode.DocumentPasteEditProvider {
	async provideDocumentPasteEdits(
		document: vscode.TextDocument,
		ranges: readonly vscode.Range[],
		dataTransfer: vscode.DataTransfer,
		context: vscode.DocumentPasteEditContext,
		token: vscode.CancellationToken
	): Promise<vscode.DocumentPasteEdit[] | undefined> {
		// Only handle Markdown files
		if (document.languageId !== 'markdown') {
			return undefined;
		}

		// Try to get HTML content from clipboard
		const htmlData = dataTransfer.get('text/html');
		if (!htmlData) {
			// No HTML content, let default paste handler work
			return undefined;
		}

		const htmlContent = await htmlData.asString();
		if (!htmlContent) {
			return undefined;
		}

		// Convert HTML to Markdown
		const markdownText = this.convertHtmlToMarkdown(htmlContent);
		
		// If we couldn't extract any useful formatting, return undefined
		// to let the default paste handler work
		if (!markdownText) {
			return undefined;
		}

		// Create paste edit with snippet string
		const snippet = new vscode.SnippetString(markdownText);
		const edit = new vscode.DocumentPasteEdit(snippet, 'Markdown Formatting', vscode.DocumentDropOrPasteEditKind.Empty);
		return [edit];
	}

	/**
	 * Converts HTML content to Markdown, preserving bold formatting and hyperlinks
	 */
	private convertHtmlToMarkdown(html: string): string | undefined {
		// Remove common HTML document wrapping if present
		let content = html;
		
		// Extract body content if it exists
		const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		if (bodyMatch) {
			content = bodyMatch[1];
		}

		// Track if we found any formatting to preserve
		let hasFormatting = false;

		// Convert paragraph tags to double newlines (paragraph breaks)
		content = content.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
		content = content.replace(/<\/?p[^>]*>/gi, '');

		// Convert br tags to newlines
		content = content.replace(/<br\s*\/?>/gi, '\n');

		// Convert bold tags (<b>, <strong>) to Markdown **text**
		content = content.replace(/<(b|strong)(?:\s[^>]*)?>([^<]*)<\/\1>/gi, (match, tag, text) => {
			hasFormatting = true;
			return `**${text}**`;
		});

		// Convert italic tags (<i>, <em>) to Markdown *text*
		content = content.replace(/<(i|em)(?:\s[^>]*)?>([^<]*)<\/\1>/gi, (match, tag, text) => {
			hasFormatting = true;
			return `*${text}*`;
		});

		// Convert hyperlinks (<a href="url">text</a>) to Markdown [text](url)
		content = content.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, (match, url, text) => {
			hasFormatting = true;
			return `[${text}](${url})`;
		});

		// Convert code tags (<code>) to Markdown `text`
		content = content.replace(/<code(?:\s[^>]*)?>([^<]*)<\/code>/gi, (match, text) => {
			hasFormatting = true;
			return `\`${text}\``;
		});

		// Remove remaining HTML tags but keep their text content
		content = content.replace(/<[^>]+>/g, '');

		// Decode common HTML entities
		content = content
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&apos;/g, "'");

		// First, normalize paragraph breaks to a placeholder to protect them
		content = content.replace(/\n\n+/g, '<<<PARAGRAPH_BREAK>>>');
		
		// Now replace all remaining single newlines with spaces
		content = content.replace(/\n/g, ' ');
		
		// Restore paragraph breaks
		content = content.replace(/<<<PARAGRAPH_BREAK>>>/g, '\n\n');
		
		// Collapse multiple spaces into single spaces
		content = content.replace(/[ \t]+/g, ' ');
		
		// Clean up extra whitespace at start/end
		content = content.trim();

		// Only return the converted content if we found formatting
		// Otherwise let the default paste handler work
		return hasFormatting ? content : undefined;
	}
}
