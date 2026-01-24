# Testing Markovia

## Quick Start

1. **Launch Extension Development Host**:
   - Press `F5` in VS Code
   - This will open a new VS Code window with Markovia loaded

2. **Open the Demo File**:
   - In the Extension Development Host window, open `demo.md`
   - You should immediately see the WYSIWYG styling applied:
     - **Toolbar at the top**: Clickable formatting buttons appear above the first line
     - Headings appear bold
     - `#` symbols are faded
     - Links are underlined with faded URLs
     - Bold and italic text is styled

3. **Try the Formatting Toolbar**:
   - Look at the **top of the file** - you'll see buttons like "Bold", "Italic", "Code", "Link", etc.
   - These are CodeLens items that appear inline with your code
   - Click them to apply formatting to selected text
   - Or use keyboard shortcuts

4. **Test Live Editing**:
   - Type `**bold text**` and watch it become bold with faded markers
   - Type `*italic*` and see it italicize
   - Type `[link](url)` and see the URL fade while the link text stays prominent

## Features to Test

### Top-of-File Toolbar
- [x] Toolbar appears at line 0 when opening a Markdown file
- [x] Buttons are clickable and trigger the correct commands
- [x] Toolbar disappears when switching to non-Markdown files
- [x] Can be toggled on/off with the "Markovia: Toggle Toolbar" command

### WYSIWYG Rendering
- [x] Headings (# symbols faded, text bold)
- [x] Bold (**markers faded, text bold**)
- [x] Italic (*markers faded, text italic*)
- [x] Strikethrough (~~markers faded, text struck~~)
- [x] Inline code (`backticks faded, background added`)
- [x] Links ([text] visible and underlined, (url) faded and italic)
- [x] Lists (- or 1. markers faded)
- [x] Blockquotes (> marker faded, content italic)
- [x] Code blocks (``` faded, content has background)

### Keyboard Shortcuts
- `Ctrl/Cmd+B`: Bold
- `Ctrl/Cmd+I`: Italic
- `Ctrl/Cmd+K`: Insert Link
- `Ctrl/Cmd+Shift+1-6`: Headings
- `Ctrl/Cmd+Shift+8`: Bullet List
- `Ctrl/Cmd+Shift+7`: Numbered List

## Configuration

Test the settings in VS Code settings:
- `markovia.enableWYSIWYG`: Turn WYSIWYG on/off
- `markovia.showToolbar`: Show/hide the top toolbar

## Expected Behavior

When you type or edit Markdown:
- Decorations update in real-time
- Syntax markers become semi-transparent
- Content is styled appropriately
- The raw Markdown remains visible and editable
- Toolbar buttons at the top provide quick access to formatting
- You get the best of both worlds: WYSIWYG-style rendering with full Markdown control
