/**
 * Represents a range of lines in the document
 */
export interface LineRange {
	start: number;  // 0-indexed line number (inclusive)
	end: number;    // 0-indexed line number (inclusive)
}

/**
 * Authorship data structure
 */
export interface AuthorshipData {
	external: LineRange[];
}

/**
 * Complete frontmatter data with authorship and other fields
 */
export interface FrontmatterData {
	authorship?: AuthorshipData;
	[key: string]: any;  // Other frontmatter fields preserved
}

/**
 * Result of frontmatter extraction
 */
export interface FrontmatterResult {
	data: FrontmatterData;
	contentStartLine: number;  // Line where content starts (after frontmatter)
	rawFrontmatter: string;    // Original YAML string
}
