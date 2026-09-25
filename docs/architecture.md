# Architecture

```
src/
  main.ts               plugin entry: commands, context menu, edit runner, history, view registration
  prompt-box.ts         floating prompt box (desktop) / bottom-sheet modal (mobile)
  editor-extension.ts   CodeMirror state field: tracked ranges, highlight and badge decorations
  ai.ts                 backend dispatch, prompts, output normalisation, Anthropic + OpenAI-compatible
  claude-cli.ts         headless `claude -p` runner (stream-json)
  codex-cli.ts          headless `codex exec --json` runner
  acp.ts                Agent Client Protocol client with a warm session pool
  process.ts            child-process helpers, PATH augmentation, command resolution
  stream.ts             the text/thinking event type every backend yields
  history.ts            edit records with change events
  log-view.ts           the sidebar "AI edits" panel
  chat.ts               Ask AI conversation state, context block, request building (no DOM)
  chat-view.ts          the sidebar "Ask AI" chat view
  setup-link.ts         obsidian://notekit-edit setup links: build, parse, validate
  import-modal.ts       confirmation dialog for setup links
  qr-terminal.ts        terminal QR rendering for the bridge (bridge only)
  settings.ts           settings model, migration, agent presets, settings tab
  wizard.ts             first-run wizard
  bridge.ts             standalone Node server, built to bridge/claude-bridge.cjs
```

## A chat, end to end

1. *Ask AI about selection / this note* (context menu or command) calls `openChat` in `main.ts`,
   which starts a fresh `ChatSession` (`chat.ts`) with the file, the scope and the selected text, and
   reveals the `ChatView` in the right sidebar.
2. On send, the session reads the note's current text (the open editor, else the vault), builds a
   context block from it and puts it in front of the first question, keeps only completed
   question/answer pairs, and calls `streamChat` in `ai.ts` with the chat system prompt.
3. `streamChat` shares the backend dispatch with edits. Anthropic and OpenAI-compatible agents get
   the turns as real messages; the CLI and ACP agents get `flattenConversation`'s transcript.
4. The session appends events to the answer turn and emits `change`; the view re-renders once per
   frame, rebuilding only the streaming answer. Copy, Insert and Replace call back into `main.ts`,
   which edits the note through the Obsidian `Editor` API.

## An edit, end to end

1. The context menu or command opens a `PromptBox` for the current selection or cursor. Opening it
   dispatches a `setJob` effect so the target range is tracked and highlighted (`status: target`).
2. On Enter the box hands its job id and range to `runEdit` in `main.ts`, which records an
   `EditRecord`, marks the job `generating` (highlight plus badge) and builds an `EditRequest`: the
   instruction, the selection (empty in cursor mode) and the note text before and after it.
3. `streamEdit` in `ai.ts` picks the backend by provider type. Every backend is an async generator of
   `StreamEvent`s: `text` events go into the note, `thinking` events into the history record.
4. The first text delta replaces the original range; later deltas are inserted at the range end. These
   transactions carry `addToHistory: false`. The state field maps the range through every transaction
   (including the user's own edits elsewhere), and drops all jobs if a transaction replaces the whole
   document, which is what a file reload looks like.
5. On completion the original text is silently restored and replaced once more by the normalised
   final text in a single history transaction, so Cmd/Ctrl+Z undoes the whole edit. The job flips to
   `done` (green flash) and is removed shortly after. Errors restore the original text and flag the
   job `error`.

## Backends

- **Anthropic**: official SDK in browser mode; streaming with adaptive summarised thinking and
  server-side refusal fallbacks.
- **OpenAI-compatible**: `fetch` with SSE parsing; `event:` lines are ignored so Hermes' tool-progress
  events never reach the note. A `TypeError` from `fetch` before any bytes arrive (CORS, mixed content)
  triggers a retry through Obsidian's `requestUrl` without streaming.
- **Claude Code / Codex CLIs**: `spawnLineProcess` in `process.ts` runs the CLI with an augmented
  `PATH`, feeds the prompt on stdin and parses newline-delimited JSON. Desktop only; `canSpawn()`
  checks for Node's `require` at runtime, which does not exist on mobile.
- **ACP**: `AcpAgent` owns one process and a pool of sessions. It answers `session/request_permission`
  according to the agent's *Allow tools* setting and refuses `fs/*` and `terminal/*` requests.

The bridge reuses `claude-cli.ts`, `codex-cli.ts` and `acp.ts` unchanged and wraps them in an
OpenAI-compatible HTTP surface.

## Persistence

`data.json` holds the settings (including agents and keys) and the last 50 edit records. Settings from
versions before 0.2 (a single Anthropic key at the top level) are migrated into a Claude agent on load.
