# Changelog

All notable changes to Notekit Edit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/): MAJOR for breaking changes to settings or behaviour,
MINOR for new features, PATCH for fixes. Versions are plain `MAJOR.MINOR.PATCH` with no `v` prefix,
as Obsidian requires.

## [Unreleased]

### Added
- Set up an agent by scanning a QR code: the bridge prints a QR code and an `obsidian://notekit-edit` setup link when it starts; the phone's camera opens Obsidian, which confirms and adds the agent. New bridge options `--public-url` and `--no-qr`.
- Settings > **Import setup link** accepts the same link pasted as text.
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

[Unreleased]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.2.1...HEAD
[0.2.1]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/pocketcorp-agency/notekit-edit/releases/tag/0.1.0
