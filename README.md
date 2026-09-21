# AI Inline Edit — Obsidian plugin

Select text, tell an AI what to change, and watch the passage get rewritten in place — or put the cursor
somewhere and have it write there. Uses your **Claude Pro/Max or ChatGPT subscription** through the Claude Code /
Codex CLIs (no API key needed), or an API key if you prefer. Works on desktop and mobile.

![Right-click a selection and choose “Ask AI to edit selection”](docs/screenshots/1-context-menu.png)

![Type an instruction in the small prompt box](docs/screenshots/2-prompt-box.png)

![The passage is highlighted with a progress badge while the text streams in](docs/screenshots/3-generating.png)

![With nothing selected, the AI writes at the cursor](docs/screenshots/6-write-at-cursor.png)

![The AI edits panel shows every edit with its original, output and thinking](docs/screenshots/4-edits-panel.png)

![First-run wizard: Claude or Codex, subscription or API key](docs/screenshots/5-setup-wizard.png)

## How it works

1. **Right-click** (long-press on mobile) in a note and choose **Ask AI to edit selection** — or, with
   nothing selected, **Ask AI to write here**. A small prompt box appears next to the text.
2. Type an instruction such as *"make this less formal"* or *"add a short summary of the section above"*
   and press **Enter**.
3. While the agent works, that spot in the note shows a **progress indicator**: the passage (or the
   cursor position) is highlighted and a small "⟳ *agent name*" badge sits at its end. Text streams in as
   it arrives; when the edit is finished the badge disappears and the highlight fades (red briefly if
   something went wrong — the original text is restored on failure).
4. The whole note is sent along as context, so the AI knows what it's editing. Each edit is
   **one undo step** — `Cmd/Ctrl+Z` reverts it.

If your instruction is a question rather than an edit ("is this claim accurate?"), the passage is left
unchanged and the answer is appended as a `> [!note] AI` callout.

### The AI edits panel

Click the ✦ ribbon icon (or run *Open AI edits panel*) to open a sidebar with every edit: agent, note,
time, duration and status. Expand an entry to see the **instruction**, the **original text**, the exact
**output**, and the model's **thinking** where the agent exposes it (Anthropic API: summarised thinking;
Codex: reasoning summaries; ACP agents: thought chunks. The Claude Code CLI currently doesn't emit
reasoning text, so that section stays empty for it). Running edits can be cancelled from here; the
trash icon clears finished entries. The last 50 edits are kept across restarts.

The command *Ask AI to edit selection / write at cursor* does the same as the context menu item — assign it
a hotkey, or add it to the **mobile toolbar** (Settings → Mobile → Manage toolbar options).
*Cancel running AI edits* stops all in-flight generations and restores the original text.
On mobile the prompt box opens as a bottom sheet so it plays nicely with the on-screen keyboard.

## First run: the setup wizard

When the plugin is enabled for the first time a short wizard opens (re-run it any time via
*Settings → AI Inline Edit → Relaunch wizard* or the command *Run setup wizard*):

1. **Claude or Codex?**
2. **Subscription or API key?**
   - *Subscription* uses the CLI that's already installed and logged in on your computer —
     **Claude Code** (`claude`, Claude Pro/Max) or the **Codex CLI** (`codex`, ChatGPT Plus/Pro).
     Nothing to enter; the wizard just checks that the CLI is found and logged in.
   - *API key* asks for an Anthropic or OpenAI key and calls the API directly.

Out of the box (before the wizard finishes) the plugin already uses local Claude Code.

## Agents

The plugin sends edits to whichever **agent** you pick. Add as many as you like under
*Settings → AI Inline Edit → Agents*; when more than one is configured, the prompt box shows a picker
(the last choice sticks as the default). Every agent has a **Test** button.

| Type | What it does | Where it runs |
| --- | --- | --- |
| **Claude Code CLI** | Runs `claude -p` with tools disabled; reuses the CLI's login (subscription or key). Streams. Model alias + effort configurable. | Desktop |
| **Codex CLI** | Runs `codex exec --json` in a read-only sandbox; reuses `codex login`. | Desktop |
| **ACP agent** | Speaks the [Agent Client Protocol](https://agentclientprotocol.com) over stdio to any ACP agent — `npx -y @agentclientprotocol/claude-agent-acp`, `gemini --experimental-acp`, `codex-acp`, … The process and session stay warm for 10 min so follow-up edits are fast. Tool permission requests are rejected unless *Allow tools* is on. | Desktop |
| **Claude (API key)** | Anthropic API via the official SDK. Default `claude-opus-5`; refusal fallbacks enabled. | Desktop + mobile |
| **OpenAI-compatible** | Anything serving `POST {baseUrl}/chat/completions`: OpenAI (`gpt-6-astra`), Hermes Agent, Ollama, LM Studio, OpenRouter, vLLM, and the **bridge** below. SSE streaming with an automatic non-streaming fallback when the server doesn't allow Obsidian's origin (CORS). | Desktop + mobile |

Claude Code and Codex are the cheapest paths for subscribers: `claude -p` with tools off sends only a few hundred tokens of
overhead per edit, whereas the ACP adapter loads the full Claude Code harness (≈25k cached tokens per session).

### Using your subscription from a phone: the bridge

Phones can't run the CLIs, so the repo ships a tiny OpenAI-compatible server that runs them on your computer:

```bash
node bridge/claude-bridge.cjs --key <choose-a-secret>            # Claude Code (default), port 8765
node bridge/claude-bridge.cjs --key <secret> --backend codex      # Codex CLI
node bridge/claude-bridge.cjs --key <secret> --backend acp --acp-command "npx -y @agentclientprotocol/claude-agent-acp"
```

Then in Obsidian on the phone: *Add agent → Claude Code bridge* (or choose *Subscription* in the wizard), base URL
`http://<computer-ip>:8765/v1`, API key = the `--key`, model `claude` (or `opus`/`sonnet`/`haiku`; `codex` for the Codex backend).
Reach the computer over your LAN, Tailscale, or a VPN — the bridge listens on all interfaces and the key is the only
protection, so keep it secret. It sends CORS headers, so streaming works from Obsidian directly.

### Hermes Agent on another computer

1. On the machine running Hermes, set in `~/.hermes/.env`:
   ```
   API_SERVER_KEY=<a strong secret>
   API_SERVER_HOST=0.0.0.0          # listen on the network, not just localhost
   API_SERVER_CORS_ORIGINS=app://obsidian.md,capacitor://localhost,http://localhost
   ```
   The CORS line enables live streaming from Obsidian desktop (`app://obsidian.md`), iOS (`capacitor://localhost`)
   and Android (`http://localhost`); without it edits still work via the non-streaming fallback.
2. Start it with `hermes gateway` (default port 8642) and make sure the port is reachable from your devices.
3. In Obsidian: *Add agent → Hermes Agent*, set **Base URL** to `http://<that-machine>:8642/v1`,
   **API key** to your `API_SERVER_KEY`, keep model `hermes-agent` (or your profile name), then press **Test**.

Keep in mind the Hermes API server has access to that machine's tools (including the terminal); the plugin's
prompt asks it not to use them, but treat the key like a password.

### Other settings

| Setting | Default | Notes |
| --- | --- | --- |
| Extra instructions | — | Appended to the system prompt (style, language, …) |
| Max output tokens | 16000 | |

API keys are stored in the vault's `.obsidian/plugins/ai-inline-edit/data.json`; don't sync that file to
places you don't trust.

## Install

**From the community plugin list** (once accepted): *Settings → Community plugins → Browse*, search for
“AI Inline Edit”, install and enable.

**Manually:** download `main.js`, `manifest.json` and `styles.css` from the
[latest release](../../releases/latest) into `<vault>/.obsidian/plugins/ai-inline-edit/`, reload Obsidian and
enable the plugin. Or build it yourself and copy `main.js`, `manifest.json` and `styles.css` into
`<vault>/.obsidian/plugins/ai-inline-edit/`:

```bash
npm install
npm run build
VAULT="/path/to/your/vault"
mkdir -p "$VAULT/.obsidian/plugins/ai-inline-edit"
cp main.js manifest.json styles.css "$VAULT/.obsidian/plugins/ai-inline-edit/"
```

Then reload Obsidian (or toggle the plugin off/on) and enable **AI Inline Edit**.
For mobile, let Obsidian Sync (or any file sync) carry the `.obsidian/plugins/ai-inline-edit` folder over,
or install it with a plugin such as BRAT.

## Development

```bash
npm run dev      # watch mode, rebuilds main.js on save
npm run build    # type-check + minified production build (also builds bridge/claude-bridge.cjs)
npm run lint     # eslint with the Obsidian plugin guideline rules
```

Releases: `npm version x.y.z` bumps `manifest.json` / `versions.json`; pushing the tag triggers the
GitHub Action that attaches `main.js`, `manifest.json`, `styles.css` and the bridge to the release.

Source layout:

- `src/main.ts` — plugin entry: commands, context menu, selection watcher, and the streaming edit runner
- `src/prompt-box.ts` — the floating prompt box (desktop) / modal (mobile)
- `src/editor-extension.ts` — CodeMirror state field that tracks each edit range and renders the
  target / generating / done / error highlights
- `src/ai.ts` — backend dispatch: Anthropic SDK, OpenAI-compatible SSE (with non-streaming fallback), local CLIs, ACP; output normalisation
- `src/claude-cli.ts`, `src/codex-cli.ts` — headless `claude -p` / `codex exec` runners (subscription auth)
- `src/acp.ts` — minimal Agent Client Protocol client with a warm session pool
- `src/process.ts` — child-process helpers (PATH augmentation so CLIs resolve from inside Obsidian)
- `src/wizard.ts` — first-run setup wizard
- `src/history.ts`, `src/log-view.ts` — edit records and the sidebar "AI edits" panel
- `src/stream.ts` — the text/thinking event type every backend yields
- `src/bridge.ts` — the standalone bridge server, built to `bridge/claude-bridge.cjs`
- `src/settings.ts` — settings model, migration, agent presets and the settings tab
- `styles.css` — highlight animations and prompt box styling
