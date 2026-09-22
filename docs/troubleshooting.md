# Troubleshooting

Start with the edits panel (ribbon icon): every failed edit keeps its error message there.

| Message | Cause | Fix |
| --- | --- | --- |
| Command not found. Check the agent's command/path in settings | The CLI is not on the paths the plugin searches | Set the full path (`which claude` / `which codex`) in the agent card |
| Not logged in, run `claude` and use /login | Claude Code has no credentials | Run `claude` in a terminal and log in; then press Test |
| NOT logged in, run `codex login` | Codex has no credentials | Run `codex login` |
| Invalid API key / Authentication failed | Wrong or expired key, or wrong bridge key | Re-enter the key; for the bridge use the `--key` value |
| Endpoint not found, check the base URL | Base URL without `/v1` or wrong port | Use `http://host:port/v1` |
| Could not reach the server | Server down, wrong host, firewall | Open `http://host:port/health` from the same device |
| Claude declined this edit | A safety classifier refused | Rephrase the instruction |
| The response was cut off | Output longer than *Max output tokens* | Raise the setting or select less text |
| The agent returned no text | The server answered without content | Check the model name with Test |
| "runs a local process and only works on desktop" | A CLI or ACP agent was picked on mobile | Use an API-key agent or the [bridge](bridge.md) |

## Text lands all at once instead of streaming

The server did not allow Obsidian's origin, so the plugin fell back to a non-streaming request. Allow
`app://obsidian.md`, `capacitor://localhost` and `http://localhost` on the server (Hermes:
`API_SERVER_CORS_ORIGINS`); the bridge already does this.

## The note switched while an edit was running

The edit is cancelled and logged as such; nothing is written to the other note. The partial text is
not restored in the note that was closed, so undo there if needed.

## The wizard reports the CLI but edits fail

The wizard only runs `--version` and the login status. Try the agent's **Test** button and then a
short edit; the edits panel shows the CLI's stderr in the error message.

## Reasoning is empty

The Claude Code CLI does not emit reasoning text. The Anthropic API agent, Codex and ACP agents do.

## Resetting

Delete `<vault>/.obsidian/plugins/obsidianize-edit/data.json` (settings, agents, keys and the edits
log) and reload Obsidian; the wizard runs again.
