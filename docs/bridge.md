# Bridge: a subscription on another machine

Obsidian on a phone cannot run the Claude Code or Codex CLI. The bridge is a small Node script,
built from `src/bridge.ts` into `bridge/claude-bridge.cjs`, that runs on a computer where the CLI is
logged in and exposes it as an OpenAI-compatible HTTP endpoint. Any device on the same network (or a
VPN such as Tailscale) can then use the subscription through it.

## Quick setup

On the computer where `claude` (or `codex`) is installed and logged in, from a clone of this
repository:

```bash
npm install && npm run build
npm run bridge:setup -- --install      # macOS or Linux: runs in the background, starts at login
npm run bridge:setup                   # any system: runs in this terminal until Ctrl+C
```

The setup checks that the CLI is logged in, creates a random key once in
`~/.config/notekit-bridge/key` (mode 600; `%APPDATA%\notekit-bridge\key` on Windows) and reuses it
afterwards, so a paired phone keeps working after restarts. It then prints the QR code; scan it with
the phone's camera. More options:

| Command | What it does |
| --- | --- |
| `npm run bridge:setup -- --pair` | Prints the QR code again for the installed bridge |
| `npm run bridge:setup -- --uninstall` | Removes the background service; the key file stays |
| `--backend codex` / `--backend acp --acp-command "…"` | Serves Codex or an ACP agent instead of Claude Code |
| `--port 9000`, `--public-url https://…/v1` | Other port; address the phone should use (VPN, reverse proxy) |

`--install` writes a launchd agent (`~/Library/LaunchAgents/agency.pocketcorp.notekit-bridge.plist`,
logs in `~/Library/Logs/notekit-bridge.log`) on macOS and a systemd user service
(`~/.config/systemd/user/notekit-bridge.service`, logs via `journalctl --user -u notekit-bridge`) on
Linux. On Linux the user service stops when you log out unless you run `loginctl enable-linger`. To
unpair every phone, delete the key file and run the setup again.

## Start it by hand

```bash
node bridge/claude-bridge.cjs --key <choose-a-secret>                    # Claude Code, port 8765
node bridge/claude-bridge.cjs --key <secret> --backend codex            # Codex CLI
node bridge/claude-bridge.cjs --key <secret> --backend acp \
     --acp-command "npx -y @agentclientprotocol/claude-agent-acp"     # any ACP agent
```

Options: `--port` (8765), `--host` (0.0.0.0), `--cwd` (working directory for the agent, defaults to
the home directory), `--allow-tools` (ACP only), `--claude-command`, `--codex-command`,
`--public-url` (the base URL phones should use, see below) and `--no-qr`. The key can also come from
the `BRIDGE_KEY` environment variable or a file (`--key-file PATH`), and `--pair` prints the setup QR
code and exits without starting the server. The bridge refuses to start without a key.

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
