# Bridge: a subscription on another machine

Obsidian on a phone cannot run the Claude Code or Codex CLI. The bridge is a small Node script,
built from `src/bridge.ts` into `bridge/claude-bridge.cjs`, that runs on a computer where the CLI is
logged in and exposes it as an OpenAI-compatible HTTP endpoint. Any device on the same network (or a
VPN such as Tailscale) can then use the subscription through it.

## Start it

```bash
node bridge/claude-bridge.cjs --key <choose-a-secret>                    # Claude Code, port 8765
node bridge/claude-bridge.cjs --key <secret> --backend codex            # Codex CLI
node bridge/claude-bridge.cjs --key <secret> --backend acp \
     --acp-command "npx -y @agentclientprotocol/claude-agent-acp"     # any ACP agent
```

Options: `--port` (8765), `--host` (0.0.0.0), `--cwd` (working directory for the agent, defaults to
the home directory), `--allow-tools` (ACP only), `--claude-command`, `--codex-command`,
`--public-url` (the base URL phones should use, see below) and `--no-qr`. The key can also come from
the `BRIDGE_KEY` environment variable. The bridge refuses to start without a key.

Endpoints: `GET /v1/models`, `POST /v1/chat/completions` (with `stream: true` for SSE, thinking is
forwarded as `reasoning_content`), `GET /health`. CORS headers are sent, so Obsidian can stream from it
directly.

## Use it from Obsidian

**Scan the QR code.** When it starts in a terminal, the bridge prints a QR code and a setup link for
this computer's local address. Scan the code with the phone's camera app: it opens Obsidian, which
shows the agent it is about to add; confirm with **Add agent**. The link below the code can also be
pasted under Settings > Notekit Edit > **Import setup link**. The format is documented in
[setup-links.md](setup-links.md).

The bridge guesses the address by preferring private network ranges (`192.168.*`, `10.*`,
`172.16-31.*`, then Tailscale's `100.64-127.*`) and lists the other addresses underneath. If the phone
reaches the computer by another name, for example over a VPN or a reverse proxy with TLS, start it with
`--public-url https://bridge.example.ts.net/v1`. When the output is not a terminal (launchd, a log
file) only the link is printed.

The QR code contains the bridge key. Anyone who sees it can use your subscription through the bridge,
so do not share screenshots of it.

**Or enter it by hand.** Add an agent of type OpenAI-compatible (the wizard's *Subscription* choice on mobile does this, or
change a card's type on desktop):

- base URL `http://<computer-ip>:8765/v1`
- API key: the `--key` value
- model: `claude` (or `opus`, `sonnet`, `haiku`), `codex` for the Codex backend, `acp` for an ACP agent

Press **Test** to confirm the connection.

## Security

The bridge listens on all interfaces and the key is the only protection. Keep it on a private
network or behind a VPN, do not expose port 8765 to the internet without a reverse proxy with TLS,
and remember that whoever holds the key can spend your subscription. With `--allow-tools` an ACP agent
may read and write inside `--cwd`.

## Keep it running

`launchd` (macOS), a `systemd` user unit (Linux) or `pm2` can keep the bridge alive across reboots.
A minimal macOS example:

```xml
<!-- ~/Library/LaunchAgents/agency.pocketcorp.notekit-bridge.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>agency.pocketcorp.notekit-bridge</string>
  <key>ProgramArguments</key><array>
    <string>/usr/local/bin/node</string>
    <string>/path/to/notekit-edit/bridge/claude-bridge.cjs</string>
    <string>--key</string><string>your-secret</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
```

Load it with `launchctl load ~/Library/LaunchAgents/agency.pocketcorp.notekit-bridge.plist`.
