# Getting started

## Install

**Community plugin list.** Settings > Community plugins > Browse, search for "Notekit Edit",
install, enable.

**Manual.** Download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/pocketcorp-agency/notekit-edit/releases/latest) into
`<vault>/.obsidian/plugins/notekit-edit/`, reload Obsidian and enable the plugin under
Settings > Community plugins.

**From source.** See [development.md](development.md); `npm run deploy` builds and copies the plugin into a vault.

## The setup wizard

The wizard opens the first time the plugin is enabled and can be reopened any time from
Settings > Notekit Edit > Relaunch wizard, or with the command *Run setup wizard*.

1. **Claude or Codex.**
2. **Subscription or API key.**
   - *Subscription* uses the command-line tool that is already installed and logged in on the
     computer: Claude Code (`claude`, Claude Pro/Max) or the Codex CLI (`codex`, ChatGPT Plus/Pro).
     The wizard checks that the tool is found and logged in; there is nothing to type.
   - *API key* asks for an Anthropic or OpenAI key and calls the API directly.
3. Finish. The chosen agent becomes the default; existing agents are kept.

If the CLI is not found, install it and log in once from a terminal:

```bash
npm install -g @anthropic-ai/claude-code && claude        # then use /login inside claude
npm install -g @openai/codex && codex login
```

GUI applications do not see your shell `PATH`, so the plugin looks in the usual places
(`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, nvm, volta, bun). If your CLI lives elsewhere,
set its full path in the agent's settings.

Before the wizard finishes, a fresh install already has a local Claude Code agent configured, so the
plugin works out of the box on a machine where `claude` is logged in.

## Your first edit

1. Open a note and select a sentence or paragraph.
2. Right-click (long-press on mobile) and choose **Ask AI to edit selection**.
3. Type an instruction, for example "make this shorter" or "turn this into a bullet list", and press
   Enter.
4. The passage is highlighted and shows a badge with the agent's name while it works. The replacement
   streams in as it arrives; the highlight flashes green when done. Press Cmd/Ctrl+Z to undo the whole
   edit in one step.

With nothing selected, the menu item reads **Ask AI to write here** and the text is inserted at the
cursor. See [usage.md](usage.md) for everything else.

## Mobile

The plugin runs on Obsidian mobile, but a phone cannot run the Claude Code or Codex CLI. Two options:

- Use an **API key** agent (Anthropic or OpenAI).
- Run the **bridge** on a computer and point the phone at it, so the subscription is used there. The
  wizard's *Subscription* step on mobile asks for the bridge address. See [bridge.md](bridge.md).

To trigger edits comfortably on a phone, add the command *Ask AI to edit selection / write at cursor*
to the mobile toolbar (Settings > Mobile > Manage toolbar options).
