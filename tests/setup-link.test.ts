import { buildSetupLink, isInsecureRemoteUrl, parseSetupLink, parseSetupLinkUrl } from "../src/setup-link";
import { qrMatrix, renderQr } from "../src/qr-terminal";
import { assert } from "./helpers";

/** Turns a link into the decoded params Obsidian hands a protocol handler (plus `action`). */
function paramsOf(link: string): Record<string, string> {
  const url = new URL(link);
  const out: Record<string, string> = { action: url.host };
  url.searchParams.forEach((v, k) => (out[k] = v));
  return out;
}

// ---- round trip: bridge-style link with a key full of reserved characters
const key = "s3cr3t&key=with+plus/slash?#%";
const bridge = buildSetupLink({ type: "openai", url: "http://192.168.1.20:8765/v1/", key, model: "claude", name: "Claude Code bridge" });
assert.match(bridge, /^obsidian:\/\/notekit-edit\?v=1&type=openai&/);
assert.ok(/^[\x21-\x7e]+$/.test(bridge), "setup links are plain printable ASCII");
let r = parseSetupLink(paramsOf(bridge));
assert.ok(r.ok);
if (r.ok) {
  assert.deepEqual(r.agent, { type: "openai", name: "Claude Code bridge", baseUrl: "http://192.168.1.20:8765/v1", apiKey: key, model: "claude", effort: undefined, headers: "" });
  assert.equal(r.makeDefault, true);
}
r = parseSetupLinkUrl(`  ${bridge}\n`);
assert.ok(r.ok && r.agent.apiKey === key, "pasted links parse the same, whitespace trimmed");

// ---- anthropic: url and model optional, effort accepted, default=false honoured
r = parseSetupLink(paramsOf(buildSetupLink({ type: "anthropic", key: "sk-ant-x", effort: "high", makeDefault: false })));
assert.ok(r.ok);
if (r.ok) {
  assert.equal(r.agent.baseUrl, "");
  assert.equal(r.agent.model, "claude-opus-5");
  assert.equal(r.agent.effort, "high");
  assert.equal(r.agent.name, "Claude (API key)");
  assert.equal(r.makeDefault, false);
}

// ---- headers survive as newline-separated lines
r = parseSetupLink(paramsOf(buildSetupLink({ type: "openai", url: "https://h.example/v1", model: "m", headers: "X-A: 1\nX-B: two" })));
assert.ok(r.ok && r.agent.headers === "X-A: 1\nX-B: two");
assert.ok(r.ok && r.agent.name === "OpenAI-compatible (h.example)", "default name uses the host");

// ---- external generators: hand-written link
r = parseSetupLinkUrl("obsidian://notekit-edit?v=1&type=openai&url=http%3A%2F%2F10.0.0.5%3A8642%2Fv1&model=hermes-agent&key=abc&headers=X-Hermes-Session-Key%3A%20notes&vault=Work");
assert.ok(r.ok && r.agent.model === "hermes-agent" && r.agent.headers === "X-Hermes-Session-Key: notes");

// ---- rejections
const rejects = (params: Record<string, string>, pattern: RegExp, why: string) => {
  const res = parseSetupLink(params);
  assert.ok(!res.ok, why);
  if (!res.ok) assert.match(res.error, pattern, why);
};
const base = { v: "1", type: "openai", url: "http://10.0.0.1:8765/v1", model: "claude" };
rejects({ ...base, v: "" }, /version/, "missing version");
rejects({ ...base, v: "2" }, /version 2.*Update/, "future version");
for (const t of ["claude-code", "codex-cli", "acp"]) rejects({ ...base, type: t }, /local agents/, `type ${t}`);
rejects({ ...base, command: "rm -rf ~" }, /command/, "command parameter");
rejects({ ...base, allowTools: "true" }, /command/, "allowTools parameter");
rejects({ ...base, type: "gemini" }, /Unknown agent type/, "unknown type");
rejects({ ...base, url: "ftp://10.0.0.1/v1" }, /http/, "non-http URL");
rejects({ ...base, url: "javascript:alert(1)" }, /http/, "javascript URL");
rejects({ ...base, url: "http://user:pw@10.0.0.1/v1" }, /user name/, "credentials in URL");
rejects({ ...base, url: "" }, /base URL/, "openai without url");
rejects({ ...base, model: "" }, /model/, "openai without model");
rejects({ ...base, effort: "high" }, /Anthropic/, "effort on openai");
rejects({ v: "1", type: "anthropic", effort: "turbo" }, /Unknown effort/, "bad effort");
rejects({ ...base, headers: "no colon here" }, /Header line/, "malformed header");
rejects({ ...base, key: "x".repeat(5000) }, /too long/, "oversized value");
assert.ok(!parseSetupLinkUrl("https://example.com/?v=1&type=openai").ok, "other schemes rejected");
assert.ok(!parseSetupLinkUrl("obsidian://open?vault=x").ok, "other Obsidian actions rejected");
assert.ok(!parseSetupLinkUrl("not a link").ok);

// ---- plain-http warning only outside the local network
assert.equal(isInsecureRemoteUrl("http://192.168.1.20:8765/v1"), false);
assert.equal(isInsecureRemoteUrl("http://100.101.1.2:8765/v1"), false, "Tailscale range counts as private");
assert.equal(isInsecureRemoteUrl("http://mybox.local:8765/v1"), false);
assert.equal(isInsecureRemoteUrl("https://example.com/v1"), false);
assert.equal(isInsecureRemoteUrl("http://example.com/v1"), true);
assert.equal(isInsecureRemoteUrl("http://8.8.8.8/v1"), true);

// ---- terminal QR: the half-block rendering encodes exactly the module matrix
const matrix = qrMatrix(bridge);
const rendered = renderQr(bridge, { quiet: 0, colour: false }).split("\n");
const n = matrix.length;
assert.equal(rendered.length, Math.ceil(n / 2));
for (let row = 0; row < n; row++) {
  for (let col = 0; col < n; col++) {
    const ch = rendered[row >> 1][col];
    const dark = row % 2 === 0 ? ch === "█" || ch === "▀" : ch === "█" || ch === "▄";
    assert.equal(dark, matrix[row][col], `module ${row},${col}`);
  }
}
assert.match(renderQr("x"), /^\x1b\[30;47m/, "coloured output forces black on white");

console.log("setup-link: ok");
