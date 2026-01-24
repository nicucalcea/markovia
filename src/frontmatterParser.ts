import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { FrontmatterData, FrontmatterResult, AuthorshipData } from './types/authorship';

/**
 * Extract frontmatter from a document
 */
export function extractFrontmatter(document: vscode.TextDocument): FrontmatterResult | null {
	const text = document.getText();
	const lines = text.split('\n');

	// Check if document starts with frontmatter delimiter
	if (lines.length < 3 || lines[0].trim() !== '---') {
		return null;
	}

	// Find closing delimiter
	let endLine = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			endLine = i;
			break;
		}
	}

	if (endLine === -1) {
		// No closing delimiter found
		return null;
	}

	// Extract YAML content (between delimiters)
	const yamlContent = lines.slice(1, endLine).join('\n');
	const rawFrontmatter = lines.slice(0, endLine + 1).join('\n');

	try {
		const data = yaml.load(yamlContent) as FrontmatterData || {};
		return {
			data,
			contentStartLine: endLine + 1,
			rawFrontmatter
		};
	} catch (error) {
		// Invalid YAML
		console.error('Failed to parse frontmatter:', error);
		return null;
	}
}

/**
 * Parse authorship data from frontmatter
 */
export function parseAuthorship(frontmatter: FrontmatterData): AuthorshipData {
	if (!frontmatter.authorship || !Array.isArray(frontmatter.authorship.external)) {
		return { external: [] };
	}

	// Validate and normalize ranges
	const external = frontmatter.authorship.external
		.filter(range => 
			typeof range.start === 'number' && 
			typeof range.end === 'number' &&
			range.start >= 0 &&
			range.end >= range.start
		)
		.map(range => ({
			start: range.start,
			end: range.end
		}));

	return { external };
}

/**
 * Serialize authorship data to YAML string
 */
export function serializeAuthorship(data: AuthorshipData): string {
	if (data.external.length === 0) {
		return '';
	}

	const yamlObj = {
		authorship: {
			external: data.external
		}
	};

	return yaml.dump(yamlObj, {
		indent: 2,
		lineWidth: -1,
		noRefs: true
	});
}

/**
 * Update frontmatter with new authorship data
 */
export function updateFrontmatter(document: vscode.TextDocument, authorship: AuthorshipData): string {
	const existing = extractFrontmatter(document);
	
	// Start with existing frontmatter data or empty object
	const frontmatterData: FrontmatterData = existing ? { ...existing.data } : {};
	
	// Update authorship field
	if (authorship.external.length > 0) {
		frontmatterData.authorship = authorship;
	} else {
		// Remove authorship if no external ranges
		delete frontmatterData.authorship;
	}

	// If frontmatter is now empty, return empty string (no frontmatter block)
	if (Object.keys(frontmatterData).length === 0) {
		return '';
	}

	// Serialize to YAML
	const yamlContent = yaml.dump(frontmatterData, {
		indent: 2,
		lineWidth: -1,
		noRefs: true
	}).trim();

	return `---\n${yamlContent}\n---`;
}

/**
 * Get the content without frontmatter
 */
export function getContentWithoutFrontmatter(document: vscode.TextDocument): { content: string, startLine: number } {
	const result = extractFrontmatter(document);
	
	if (result) {
		const lines = document.getText().split('\n');
		const content = lines.slice(result.contentStartLine).join('\n');
		return { content, startLine: result.contentStartLine };
	}

	return { content: document.getText(), startLine: 0 };
}
