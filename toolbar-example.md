# Toolbar Example

When you open this file, you should see clickable formatting buttons appear right above this heading:

**Bold** | *Italic* | `Code` | [Link](#) | • Bullet List | 1. Numbered List | > Quote | ```Code Block``` | H1 | H2 | H3

These buttons are rendered by VS Code's CodeLens feature, which means they appear as inline, clickable text above the first line of your document.

## How It Works

The toolbar uses VS Code's CodeLens API to inject clickable commands at line 0. This keeps the toolbar:
- **Contextual**: Only appears in Markdown files
- **Non-intrusive**: Doesn't take up permanent screen space like a panel
- **Integrated**: Looks like part of your document
- **Accessible**: Can be toggled on/off

## Try It Out

1. Select some text below
2. Click the "Bold" button in the toolbar above
3. Watch the text become **bold** with faded markers

Test text: Make me bold!
