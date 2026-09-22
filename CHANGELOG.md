# Changelog

All notable changes to Notekit Edit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/): MAJOR for breaking changes to settings or behaviour,
MINOR for new features, PATCH for fixes. Versions are plain `MAJOR.MINOR.PATCH` with no `v` prefix,
as Obsidian requires.

## [Unreleased]

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

[Unreleased]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.2.0...HEAD
[0.2.0]: https://github.com/pocketcorp-agency/notekit-edit/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/pocketcorp-agency/notekit-edit/releases/tag/0.1.0
