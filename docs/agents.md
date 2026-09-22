# Agents

An agent is one configured backend. The wizard creates them; Settings > Obsidianize Edit > Agents
lists them as cards where every field can be changed, tested and removed. When several agents exist,
the prompt box shows a picker.

| Type | Runs where | Login | Streams | Thinking shown |
| --- | --- | --- | --- | --- |
| Claude Code CLI | desktop, local process | `claude` login (Claude Pro/Max or key) | yes | no (the CLI does not emit it) |
| Codex CLI | desktop, local process | `codex login` (ChatGPT Plus/Pro or key) | reply arrives whole | reasoning summaries |
| ACP agent | desktop, local process | whatever the agent uses | yes | thought chunks |
| Claude (Anthropic API) | desktop and mobile | Anthropic API key | yes | summarised thinking |
| OpenAI-compatible | desktop and mobile | Bearer token or none | yes, with fallback | `reasoning_content` if the server sends it |

## Claude Code CLI (subscription)

Runs `claude -p --output-format stream-json --tools "" --no-session-persistence` with the plugin's
system prompt. It reuses the CLI's own login, so a Claude Pro/Max subscription works without an API
key and there is nothing stored in Obsidian. Tools are disabled, so the CLI cannot touch files; the
overhead per edit is a few hundred tokens.

Fields: **command** (`claude` or a full path), **model** (alias such as `opus`, `sonnet`, `haiku`,
empty for the CLI default) and **effort**.

## Codex CLI (subscription)

Runs `codex exec --json --sandbox read-only --skip-git-repo-check --ephemeral` and reuses
`codex login`. The reply arrives as a whole rather than token by token. Fields: **command** and
**model**.

## Claude (Anthropic API key)

Calls the Anthropic API through the official SDK with adaptive thinking (summarised, shown in the
edits panel) and server-side refusal fallbacks. Default model `claude-opus-5`; `claude-sonnet-5` is
faster and cheaper, `claude-haiku-4-5` fastest. Fields: **API key**, **model**, **effort**, optional
**base URL** for a proxy, optional **extra headers**.

## OpenAI-compatible

Anything that serves `POST {baseUrl}/chat/completions`: OpenAI (`https://api.openai.com/v1`, model
`gpt-6-astra`), the bundled [bridge](bridge.md), Hermes Agent, Ollama, LM Studio, OpenRouter, vLLM.
Fields: **base URL** (include `/v1`), **API key** (sent as `Authorization: Bearer`, may be empty),
**model**, **extra headers**.

Streaming uses server-sent events. If the browser-level request fails before any bytes arrive, which
is what happens when a server does not allow Obsidian's origin (CORS) or blocks mixed content, the
plugin repeats the request through Obsidian's native HTTP client without streaming; the edit still
works, the text just lands at once. To get live streaming from a remote server, allow the origins
`app://obsidian.md` (desktop), `capacitor://localhost` (iOS) and `http://localhost` (Android).

The **Test** button calls `GET {baseUrl}/models` and reports whether the configured model is listed.

### Hermes Agent on another computer

On the machine running Hermes, in `~/.hermes/.env`:

```
API_SERVER_KEY=<a strong secret>
API_SERVER_HOST=0.0.0.0
API_SERVER_CORS_ORIGINS=app://obsidian.md,capacitor://localhost,http://localhost
```

Start it with `hermes gateway` (port 8642) and add an OpenAI-compatible agent with base URL
`http://<machine>:8642/v1`, the key, and model `hermes-agent` (or your profile name). The Hermes API
server has access to that machine's tools, including the terminal; the plugin's prompt asks it not to
use them, but treat the key like a password. Use *Extra headers* for `X-Hermes-Session-Key: obsidian`
if you want Hermes to keep memory across edits.

## ACP agent

Speaks the [Agent Client Protocol](https://agentclientprotocol.com) over stdio to a command you
provide, for example:

```
npx -y @agentclientprotocol/claude-agent-acp
gemini --experimental-acp
codex-acp
```

The process and its session are kept warm for ten minutes so follow-up edits are fast. The agent's
tool permission requests are rejected unless **Allow tools** is on, in which case they are approved
automatically and the agent may read files or run commands inside the vault folder. Model and login
are configured in the agent itself. Note that `claude-agent-acp` loads the full Claude Code harness
(roughly 25,000 cached tokens per session), so the Claude Code CLI agent is the cheaper choice for
plain edits.

## Choosing a type on an existing card

The **Type** dropdown on a card switches its backend; the fields that do not apply are hidden. This is
also how you configure agents the wizard does not offer, such as Hermes, Ollama or an ACP server.
