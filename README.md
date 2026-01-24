# Markovia

A simple and lightweight Markdown editor for VS Code, inspired by Typora and iA Writer. Markovia provides a WYSIWYG-style editing experience where Markdown syntax remains visible but blends into the background, creating a clean, distraction-free writing environment.

## Features

- **WYSIWYG-Style Rendering**: Markdown syntax is visible but deemphasized, allowing you to focus on your content
  - **Headings**: Display in bold with syntax marks (#) faded to 30% opacity
  - **Bold text**: Appears bold with `**` markers deemphasized
  - **Italic text**: Appears italic with `*` markers deemphasized
  - **Links**: Link text is underlined and colored, while URLs are faded and italicized
  - **Code**: Inline code has a subtle background, with backticks deemphasized
  - **Lists**: Bullet and number markers are slightly faded
  - **Blockquotes**: Content is italicized with `>` markers faded
  
- **Top-of-File Toolbar**: Quick-access formatting buttons appear at the top of each Markdown file (using CodeLens)
- **Keyboard Shortcuts**: Familiar shortcuts for fast formatting
- **CommonMark Support**: Full support for standard Markdown features
- **Clean & Lightweight**: No dependencies, pure TypeScript implementation
- **Toggle-based Formatting**: Smart toggling of formatting (apply/remove with the same command)

### Supported Formatting

- **Inline Formatting**: Bold, Italic, Strikethrough, Code
- **Links & Images**: Easy insertion with prompts
- **Headings**: All 6 levels (H1-H6)
- **Lists**: Bullet lists and numbered lists
- **Blockquotes**: Multi-line support
- **Code Blocks**: With optional language specification
- **Horizontal Rules**: Quick dividers

## Keyboard Shortcuts

All shortcuts work only in Markdown files:

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Bold | `Ctrl+B` | `Cmd+B` |
| Italic | `Ctrl+I` | `Cmd+I` |
| Strikethrough | `Ctrl+Shift+X` | `Cmd+Shift+X` |
| Inline Code | ``Ctrl+` `` | ``Cmd+` `` |
| Insert Link | `Ctrl+K` | `Cmd+K` |
| Insert Image | `Ctrl+Shift+I` | `Cmd+Shift+I` |
| Code Block | `Ctrl+Shift+C` | `Cmd+Shift+C` |
| Heading 1 | `Ctrl+Shift+1` | `Cmd+Shift+1` |
| Heading 2 | `Ctrl+Shift+2` | `Cmd+Shift+2` |
| Heading 3 | `Ctrl+Shift+3` | `Cmd+Shift+3` |
| Heading 4 | `Ctrl+Shift+4` | `Cmd+Shift+4` |
| Heading 5 | `Ctrl+Shift+5` | `Cmd+Shift+5` |
| Heading 6 | `Ctrl+Shift+6` | `Cmd+Shift+6` |
| Bullet List | `Ctrl+Shift+8` | `Cmd+Shift+8` |
| Numbered List | `Ctrl+Shift+7` | `Cmd+Shift+7` |
| Blockquote | `Ctrl+Shift+9` | `Cmd+Shift+9` |
| Horizontal Rule | `Ctrl+Shift+H` | `Cmd+Shift+H` |

## Usage

1. Open any Markdown file (`.md` extension)
2. The formatting toolbar will appear at the top of the file (first line)
3. Click toolbar buttons to format, or use keyboard shortcuts
4. Use `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to access all commands via the command palette

### Formatting Tips

- **Toolbar**: The toolbar appears as clickable links at the top of your Markdown file. Click any button to apply formatting to your selected text.
- **Toggle behavior**: Apply formatting by selecting text and using the command. Use the same command again to remove formatting.
- **Links & Images**: When you insert a link or image, you'll be prompted for the URL. The selected text becomes the link text or alt text.
- **Code Blocks**: When inserting a code block, you can specify the language for syntax highlighting.
- **Lists & Blockquotes**: These work on entire lines. Select multiple lines to format them all at once.

## Extension Settings

This extension contributes the following settings:

- `markovia.showToolbar`: Enable/disable the formatting toolbar at the top of files (default: `true`)
- `markovia.enableWYSIWYG`: Enable/disable WYSIWYG-style rendering with visible but deemphasized Markdown syntax (default: `true`)

You can toggle the toolbar with the command "Markovia: Toggle Toolbar" from the command palette.

## Requirements

No external dependencies required. Works with VS Code 1.108.1 and above.

## Known Issues

- Font size scaling for headings is limited by VS Code's decoration API (using letter-spacing and bold weight for differentiation)
- Very long documents may experience slight rendering delays

## Release Notes

### 0.0.1

Initial release:
- WYSIWYG-style rendering with visible but deemphasized Markdown syntax
- All CommonMark formatting commands
- Keyboard shortcuts for quick formatting
- Status bar toolbar for easy access
- Toggle-based formatting operations
- Support for links, images, and code blocks
- Real-time decoration updates as you type

---

## Development

To build and test the extension locally:

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch the extension in a development window.

## License

MIT

**Enjoy using Markovia!**
