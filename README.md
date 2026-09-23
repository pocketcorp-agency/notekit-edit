<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/media/logo-small-dark.png">
    <img src="docs/media/logo-small.png" width="448" alt="Notekit Edit">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/pocketcorp-agency/notekit-edit/actions/workflows/ci.yml"><img src="https://github.com/pocketcorp-agency/notekit-edit/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://github.com/pocketcorp-agency/notekit-edit/releases/latest"><img src="https://img.shields.io/github/v/release/pocketcorp-agency/notekit-edit?label=release&color=7f6df2" alt="Latest release"></a>
  <a href="https://github.com/pocketcorp-agency/notekit-edit/releases"><img src="https://img.shields.io/github/downloads/pocketcorp-agency/notekit-edit/total?label=downloads&color=7f6df2&cacheSeconds=3600" alt="Downloads"></a>
  <a href="manifest.json"><img src="https://img.shields.io/badge/Obsidian-1.7.2%2B-483699" alt="Obsidian 1.7.2 or newer"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license"></a>
  <a href="https://pocketcorp.agency"><img src="https://img.shields.io/badge/by-pocketcorp-111111" alt="Made by pocketcorp"></a>
</p>

Notekit Edit is an [Obsidian](https://obsidian.md) plugin that turns any passage of a note into a
prompt: select text, say what should change, and the rewrite streams into the note in place. Put the
cursor on an empty line instead and it writes there, using the whole note as context. It runs on the
Claude Pro/Max or ChatGPT subscription you already have (through the Claude Code and Codex CLIs), on an
API key, or on any OpenAI-compatible or ACP agent, including a self-hosted one on another machine.

Made by [pocketcorp](https://pocketcorp.agency).

## Trailer

[![Notekit Edit trailer](docs/media/trailer-thumbnail-1280.jpg)](docs/media/trailer-preview.mp4)

Watch the [full trailer](docs/media/trailer-preview.mp4) (MP4, 960p preview). 

| Edit a selection | Write at the cursor |
| --- | --- |
| ![Select, right-click, describe the change, and the passage is rewritten in place](docs/media/demo-edit.gif) | ![With nothing selected the plugin writes at the cursor](docs/media/demo-write.gif) |

## Highlights

- **Edit in place.** Right-click a selection, type an instruction, and the replacement streams into
  the note while the passage is highlighted. One undo step reverts it.
- **Write at the cursor.** With nothing selected, the AI writes new text at the cursor with the full
  note as context.
- **Your subscription, no key required.** The default agent runs the locally installed Claude Code
  CLI and reuses its login. Codex works the same way with the ChatGPT login.
- **Any other agent.** Anthropic or OpenAI API keys, OpenAI-compatible servers (Hermes Agent, Ollama,
  LM Studio, OpenRouter, vLLM), and Agent Client Protocol agents over stdio.
- **Desktop and mobile.** Phones use the bundled bridge to reach a subscription on a computer; scan
  the QR code the bridge prints and the phone is set up.
- **Transparent.** A sidebar panel logs every edit with the original text, the exact output, the
  model's reasoning where the agent exposes it, and errors.

## Quick start

1. Install from the community plugin list (search for "Notekit Edit", once listed) or download `main.js`,
   `manifest.json` and `styles.css` from the [latest release](https://github.com/pocketcorp-agency/notekit-edit/releases/latest)
   into `<vault>/.obsidian/plugins/notekit-edit/`, then enable the plugin.
2. The setup wizard opens: choose Claude or Codex, then subscription or API key. With a subscription
   there is nothing to enter as long as `claude` (or `codex`) is installed and logged in.
3. Open a note, select some text, right-click and choose **Ask AI to edit selection**.

The full walkthrough is in [docs/getting-started.md](docs/getting-started.md).

## Documentation

| Document | Contents |
| --- | --- |
| [Getting started](docs/getting-started.md) | Installation, the setup wizard, first edit, mobile |
| [Agents](docs/agents.md) | Claude Code, Codex, API keys, ACP agents, OpenAI-compatible servers, Hermes |
| [Bridge](docs/bridge.md) | Using a subscription from a phone or another computer |
| [Setup links](docs/setup-links.md) | Setting up an agent from a QR code; the link format for your own generators |
| [Usage](docs/usage.md) | Prompt box, cursor mode, the edits panel, commands, settings |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and how to read the edits panel |
| [Architecture](docs/architecture.md) | How the editor extension, backends and bridge fit together |
| [Development](docs/development.md) | Building, tests, lint, project layout |
| [Releasing](docs/releasing.md) | Versioning rules, changelog, tagging, CI/CD |
| [Changelog](CHANGELOG.md) | What changed in each version |

## Requirements

- Obsidian 1.7.2 or newer (desktop and mobile).
- For subscription use on desktop: [Claude Code](https://docs.claude.com/en/docs/claude-code) (`claude`)
  and/or the [Codex CLI](https://developers.openai.com/codex/cli) (`codex`), logged in.
- For mobile subscription use: a computer running the bridge (Node 18 or newer). From a clone of
  this repository, `npm install && npm run build && npm run bridge:setup -- --install` sets it up and
  shows the QR code for the phone; see [docs/bridge.md](docs/bridge.md).
- An account with the AI provider you choose: a Claude or ChatGPT subscription, or an Anthropic or
  OpenAI API key (pay per use), or your own OpenAI-compatible server.

## Privacy, network access and security

This section lists everything the plugin does beyond editing text inside Obsidian, as required by the
[Obsidian developer policies](https://docs.obsidian.md/Developer+policies).

**Network requests.** Nothing is sent anywhere until you configure an agent. The plugin then talks
directly to the service behind the agent you selected; there is no intermediate server run by
pocketcorp. Depending on the agent type it connects to:

- the Anthropic API at `https://api.anthropic.com` (agent type *Claude (Anthropic API key)*), or a
  base URL you enter instead;
- the OpenAI API at `https://api.openai.com` (the wizard's *OpenAI (API key)* choice);
- any OpenAI-compatible endpoint you enter as base URL (Hermes Agent, Ollama, LM Studio, OpenRouter,
  vLLM, or the plugin's own bridge running on one of your computers);
- for the CLI and ACP agents, the plugin itself makes no request: the `claude`, `codex` or ACP process
  it starts connects to its own provider (Anthropic, OpenAI, Google, or whatever the agent uses) with
  that tool's login.

The **Test** button on an agent card makes one request to the same endpoint (`/models`, the CLI's
`--version` and login status, or an ACP `initialize`).

**What is sent.** Every edit sends the full content of the current note (capped at 150,000 characters
before and after the target for very large notes), the note's name, the selected text or the cursor
position, your instruction, and the *Extra instructions* from the settings. No other notes and no
vault metadata are sent. Nothing is sent when you only open the prompt box.

**External executables.** On desktop, and only for agents of the types *Claude Code CLI*, *Codex CLI*
and *ACP agent*, the plugin starts a local process with the command you configured: `claude -p`
(with tools disabled), `codex exec` (read-only sandbox, no approvals) or the ACP command line, using
the vault folder as working directory. The command is resolved on your `PATH` plus the usual CLI
install locations (`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, nvm, volta, bun). With an
ACP agent and *Allow tools* switched on, the agent may read and write files inside the vault folder
and run commands there; leave it off unless you want that. Mobile builds never start processes; those
agent types report an error and you use an API key or the bridge instead.

**Stored credentials.** API keys, bridge keys and any extra headers you enter are stored in plain
text in the vault's `.obsidian/plugins/notekit-edit/data.json`, together with the agent
configuration and the last 50 entries of the edits panel (instruction, original text, output and
reasoning). Exclude that file from syncs or backups you do not trust, and remember that vault sync
services copy it. The CLI agents store nothing in Obsidian; they reuse the login kept by the CLI.

**Setup links and QR codes.** The QR code the bridge prints, and any `obsidian://notekit-edit` setup
link, can contain an API or bridge key; treat them like the key itself. Opening a link never saves
anything without confirmation, and a link can only add network agents, never one that starts a
program. See [docs/setup-links.md](docs/setup-links.md).

**Accounts and payment.** The plugin is free and open source, but every agent needs an account with
its provider: a Claude Pro/Max or ChatGPT subscription for the CLI agents, a paid Anthropic or OpenAI
API key, or your own server.

**Telemetry.** None. The plugin collects no usage data, contains no analytics or crash reporting, and
does not phone home; the only network traffic is the requests to the agent you selected. Nothing is
logged to the developer console during normal use.

**The bridge.** `bridge/claude-bridge.cjs` is an optional Node script you run yourself on a computer.
It listens on the network (all interfaces, port 8765 by default), requires a key, and forwards
requests to the local CLI or ACP agent. See [docs/bridge.md](docs/bridge.md) for its security notes.

## License

[MIT](LICENSE). Copyright 2026 pocketcorp.
