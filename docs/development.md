# Development

## Prerequisites

Node 22 (any 18+ works), npm, and Obsidian for manual testing. For the subscription backends,
Claude Code and/or the Codex CLI logged in.

```bash
git clone git@github.com:pocketcorp-agency/obsidianize-edit.git
cd obsidianize-edit
npm install
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Watch mode; rebuilds `main.js` and the bridge on every save |
| `npm run build` | Type-check and produce the minified `main.js` plus `bridge/claude-bridge.cjs` |
| `npm run lint` | ESLint with the official `eslint-plugin-obsidianmd` guideline rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Bundles `tests/*.test.ts` with a mocked `obsidian` module and runs them under Node |
| `npm run check-version` | Verifies package.json, manifest.json, versions.json and CHANGELOG.md agree |
| `npm run deploy` | Builds and copies the plugin into a vault (`./deploy.sh /path/to/vault`) |

## Testing in Obsidian

`./deploy.sh "/path/to/vault"` copies `main.js`, `manifest.json` and `styles.css` into
`<vault>/.obsidian/plugins/obsidianize-edit/`. Reload Obsidian (Cmd/Ctrl+R) to pick up a new build.
The plugin logs nothing to the console by default; errors are shown in the edits panel.

## Tests

`tests/state-field.test.ts` covers the CodeMirror range tracking and output normalisation.
`tests/backends.test.ts` starts an in-process OpenAI-compatible mock server that mimics Hermes'
stream, and covers streaming, the CORS fallback, the Test button and settings migration. The CLI, ACP
and Anthropic backends are exercised manually because they need real logins; keep changes to them
small and verify with the agent card's Test button and one real edit.

## Coding conventions

- Follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines);
  `npm run lint` enforces most of them (sentence case, no `innerHTML`, no inline styles, no console
  logging, API version gating).
- Keep backends free of `obsidian` imports so the bridge can reuse them (`claude-cli.ts`,
  `codex-cli.ts`, `acp.ts`, `process.ts`, `stream.ts`).
- Every user-visible string is sentence case; no emoji anywhere in the UI or docs.
- Add a line under *Unreleased* in `CHANGELOG.md` with every user-facing change.

## Trailer and screenshots

`docs/trailer/` holds the trailer playbook, the After Effects project and the scripts that built it;
`docs/screenshots/` the README screenshots. Both are regenerated from `docs/trailer/ae/gen-scenes.py`
and the plugin's real `styles.css`; see `docs/trailer/PLAYBOOK.md`.
