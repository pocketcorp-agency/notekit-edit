# Changelog

All notable changes to Notekit Edit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/): MAJOR for breaking changes to settings or behaviour,
MINOR for new features, PATCH for fixes. Versions are plain `MAJOR.MINOR.PATCH` with no `v` prefix,
as Obsidian requires.

## [Unreleased]

### Changed
- Ask AI chat answers render as Markdown while they stream: headings, lists, tables and code blocks with syntax highlighting appear as the text arrives (an open code block is closed early so it renders as code). Re-renders are throttled to the renderer's speed, and a blinking bar marks an answer in progress.

### Fixed
- The chat's *Thinking* section keeps its open or closed state while an answer streams, and the list no longer jumps while streaming.

## [0.3.0] - 2026-09-25

### Added
- **Ask AI** chat: right-click and choose *Ask AI about selection* or *Ask AI about this note* (or the command *Ask AI about selection or note*) to open a sidebar chat about the passage or the whole note. Each question sends the note's latest content; answers render as Markdown and can be copied, inserted at the cursor or replace the selection. Works with every agent type; the CLI and ACP agents receive the conversation as a transcript.
- Set up an agent by scanning a QR code: the bridge prints a QR code and an `obsidian://notekit-edit` setup link when it starts; the phone's camera opens Obsidian, which confirms and adds the agent. New bridge options `--public-url` and `--no-qr`.
- Settings > **Import setup link** accepts the same link pasted as text.
- `npm run bridge:setup` sets up the bridge in one command: checks the CLI login, keeps a random key in `~/.config/notekit-bridge/key`, prints the pairing QR code, and with `--install` runs the bridge in the background at login (launchd on macOS, systemd on Linux). `--pair` shows the QR code again, `--uninstall` removes the service.
- Bridge options `--key-file` (read the key from a file, keeping it out of the process list) and `--pair` (print the setup QR code and exit); the bridge also stops cleanly on SIGTERM.
- The setup-link format is documented in `docs/setup-links.md` so other software can generate compatible QR codes. Links can only describe OpenAI-compatible and Anthropic agents, never local agents or commands.

## [0.2.1] - 2026-09-22

Preparation for the Obsidian community plugin directory.

### Changed
- README documents what the plugin sends where, which executables it runs, how API keys are stored and that there is no telemetry.
- Shorter plugin description in `manifest.json`.
- The command *Ask AI to edit selection / write at cursor* is now *Ask AI to edit selection or write at cursor*.
- Settings texts follow Obsidian's sentence-case style; the "no agent" and "no API key" notices point at the plugin settings.
- The GitHub release now attaches exactly `main.js`, `manifest.json` and `styles.css`; the bridge stays in the repository at `bridge/claude-bridge.cjs`. The Release workflow can also be started manually from the Actions tab with a version input, in which case it creates the tag itself.
- Internal: local agents are gated on `Platform.isDesktopApp` in addition to the lazy Node `require`, the `obsidian` typings are pinned to the minimum app version, and the lint configuration documents every rule it relaxes for the Node bridge code.

### Fixed
- The prompt box and the in-note highlight timers use the editor's own window and document, so they behave in popout windows.
- The edits panel cancels its pending render when it is closed.

## [0.2.0] - 2026-09-22

### Added
- Setup wizard on first activation: Claude or Codex, subscription or API key; relaunch from settings.
- Local Claude Code CLI agent (uses the existing `claude` login) as the default backend.
- Local Codex CLI agent (uses the existing `codex login`).
- ACP agents: any Agent Client Protocol server over stdio (claude-agent-acp, gemini-cli, codex-acp), with a warm session pool and tool-permission policy.
- OpenAI-compatible backend for OpenAI, Hermes Agent, Ollama, LM Studio, OpenRouter, vLLM and the bundled bridge, with SSE streaming and an automatic non-streaming fallback when the server does not allow Obsidian's origin.
- Bridge server (`bridge/claude-bridge.cjs`) that exposes Claude Code, Codex or an ACP agent as an OpenAI-compatible endpoint so phones can use a subscription.
- Write-at-cursor mode when nothing is selected; the whole note is sent as context.
- In-note progress indicator (highlight plus agent badge) while an edit runs.
- Sidebar panel listing every edit with original, output, thinking and errors; cancel from the panel.
- Agent picker in the prompt box when several agents are configured.

### Changed
- Renamed from AI Inline Edit to Notekit Edit (plugin id `notekit-edit`), part of the Notekit suite by pocketcorp.
- The prompt box only opens from the context menu or the command, no longer on selection.
- Minimum Obsidian version is 1.7.2.

### Removed
- Quick-action suggestion chips and the surrounding-context size setting.

## [0.1.0] - 2026-09-21

### Added
- First version: select text, describe the change in a small prompt box, and the passage is rewritten in place by Claude (Anthropic API key) with a streaming highlight.

[Unreleased]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.3.0...HEAD
[0.3.0]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.2.1...0.3.0
[0.2.1]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/pocketcorp-agency/notekit-edit/releases/tag/0.1.0
