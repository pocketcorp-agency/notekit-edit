# Setup links and QR codes

A setup link describes one agent. Opening it on a device with Notekit Edit installed shows a
confirmation dialog and then adds the agent, so nothing has to be typed. The bridge prints one as a
QR code when it starts; scanning that code with a phone's normal camera app opens Obsidian with the
link. Any other software can generate the same links and QR codes by following this page.

## Format (version 1)

```
obsidian://notekit-edit?v=1&type=<type>&url=<base URL>&model=<model>&key=<key>&name=<name>
```

Every value must be percent-encoded, for example with JavaScript's `encodeURIComponent` or Python's
`urllib.parse.quote(value, safe="")`. Encode `+` as `%2B` and spaces as `%20`. The order of
parameters does not matter.

| Parameter | Required | Meaning |
| --- | --- | --- |
| `v` | yes | Format version, `1`. Links with another version are rejected with a message to update the plugin. |
| `type` | yes | `openai` for any OpenAI-compatible server, including the bridge; `anthropic` for the Anthropic API. |
| `url` | for `openai` | Base URL including `/v1`, for example `http://192.168.1.20:8765/v1`. Only `http://` and `https://`; no user name or password inside the URL. For `anthropic` it is optional and replaces `https://api.anthropic.com` (a proxy). |
| `model` | for `openai` | Model name the server expects. Bridge: `claude`, `codex` or `acp`. For `anthropic` the default is `claude-opus-5`. |
| `key` | no | API key or bridge key. Sent as `Authorization: Bearer <key>` (OpenAI-compatible) or as the Anthropic key. |
| `name` | no | Name shown in the plugin, at most 80 characters. Defaults to "OpenAI-compatible (host)" or "Claude (API key)". |
| `effort` | no | `anthropic` only: `low`, `medium`, `high`, `xhigh` or `max`. |
| `headers` | no | Extra HTTP headers, one `Name: value` per line, lines separated by a newline (`%0A`). |
| `default` | no | `true` or `false`: preselects "Make this the default agent" in the dialog. Default `true`. |
| `vault` | no | Obsidian's own parameter: the vault to open when there are several. Without it, Obsidian uses the last open vault. |

Unknown parameters are ignored, so later versions can add fields without breaking older generators.
Each value may be at most 4096 characters.

An agent that already exists is updated rather than duplicated: the plugin matches `openai` agents
by base URL, and `anthropic` agents by type. Fields missing from the link keep their current values.

### What a link can never do

- It cannot add a local agent (Claude Code CLI, Codex CLI, ACP agent) and cannot set a command or
  the *Allow tools* switch. Opening a link must never make the plugin start a program; the types
  `claude-code`, `codex-cli` and `acp` and the parameters `command` and `allowTools` are rejected.
- It cannot save anything by itself. The dialog shows the name, type, full base URL, model and
  whether a key is included, and the agent is only added after **Add agent** is pressed. Plain
  `http://` to an address outside the local network gets an extra warning.

## Examples

Bridge on a home network:

```
obsidian://notekit-edit?v=1&type=openai&name=Claude%20Code%20bridge&url=http%3A%2F%2F192.168.1.20%3A8765%2Fv1&model=claude&key=my-bridge-key
```

Anthropic API key with high effort, not made the default:

```
obsidian://notekit-edit?v=1&type=anthropic&key=sk-ant-api03-...&effort=high&default=false
```

Hermes Agent over Tailscale with a session header, opening the vault "Work":

```
obsidian://notekit-edit?v=1&type=openai&name=Hermes&url=http%3A%2F%2F100.101.1.2%3A8642%2Fv1&model=hermes-agent&key=abc&headers=X-Hermes-Session-Key%3A%20notes&vault=Work
```

## Generating QR codes

Encode the whole link as the QR code's content (byte mode). Error correction level M works well; the
bridge uses it. Keep links under about 1000 characters so the code stays easy to scan from a screen.
iOS and Android camera apps recognise `obsidian://` links and offer to open Obsidian.

Reference generator in Node.js (`npm install qrcode`):

```js
import QRCode from "qrcode";

function setupLink(fields) {
  const q = Object.entries({ v: "1", ...fields })
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `obsidian://notekit-edit?${q}`;
}

const link = setupLink({ type: "openai", name: "Claude Code bridge", url: "http://192.168.1.20:8765/v1", model: "claude", key: "my-bridge-key" });
await QRCode.toFile("notekit-setup.png", link, { errorCorrectionLevel: "M" });
```

Python (`pip install qrcode[pil]`):

```python
from urllib.parse import quote
import qrcode

fields = {"v": "1", "type": "openai", "name": "Claude Code bridge",
          "url": "http://192.168.1.20:8765/v1", "model": "claude", "key": "my-bridge-key"}
link = "obsidian://notekit-edit?" + "&".join(f"{k}={quote(v, safe='')}" for k, v in fields.items() if v)
qrcode.make(link, error_correction=qrcode.constants.ERROR_CORRECT_M).save("notekit-setup.png")
```

## Using a link without a camera

Settings > Notekit Edit > **Import setup link** > **Paste link** accepts the same link as text,
for example one sent to yourself in a message.

## Security

A setup link that contains a key is as sensitive as the key: anyone who sees the QR code or the
link can use the agent, and a bridge key lets them spend your subscription. Do not post screenshots
of it, and restart the bridge with a new `--key` if one leaked. Only open setup links from sources you
trust, because the agent it adds receives the content of the notes you edit with it.
