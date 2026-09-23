// @ts-expect-error -- plain ESM script without type declarations
import { bridgeArgs, configDir, ensureKey, launchdPlist, parseSetupArgs, servicePath, systemdUnit } from "../scripts/bridge-setup.mjs";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assert } from "./helpers";

// ---- arguments
assert.deepEqual(
  { ...parseSetupArgs([]), acpCommand: "" },
  { backend: "claude", port: 8765, publicUrl: "", acpCommand: "", allowTools: false, mode: "run" },
);
assert.equal(parseSetupArgs(["--install", "--backend", "codex", "--port", "9000"]).mode, "install");
assert.equal(parseSetupArgs(["--backend", "acp"]).acpCommand, "npx -y @agentclientprotocol/claude-agent-acp");
assert.throws(() => parseSetupArgs(["--backend", "gpt"]), /--backend/);
assert.throws(() => parseSetupArgs(["--port", "70000"]), /--port/);
assert.throws(() => parseSetupArgs(["--key", "x"]), /Unknown option/, "the key is never taken on the command line");

// ---- key file: created once with mode 600, then reused
const tmp = mkdtempSync(join(tmpdir(), "nk-bridge-"));
try {
  const dir = configDir("/home/u", "linux", { XDG_CONFIG_HOME: tmp });
  assert.equal(dir, join(tmp, "notekit-bridge"));
  assert.equal(configDir("/home/u", "linux", {}), "/home/u/.config/notekit-bridge");
  assert.equal(configDir("C:\\Users\\u", "win32", { APPDATA: "C:\\AppData" }).endsWith("notekit-bridge"), true);
  const first = ensureKey(dir);
  assert.equal(first.created, true);
  const key = readFileSync(first.file, "utf8").trim();
  assert.match(key, /^[0-9a-f]{48}$/);
  if (process.platform !== "win32") assert.equal(statSync(first.file).mode & 0o777, 0o600);
  const second = ensureKey(dir);
  assert.equal(second.created, false);
  assert.equal(readFileSync(second.file, "utf8").trim(), key, "the key survives restarts so the phone stays paired");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// ---- bridge arguments: key only by file
const o = parseSetupArgs(["--public-url", "https://b.example.ts.net/v1"]);
const args: string[] = bridgeArgs(o, "/k/key", "/usr/local/bin/claude");
assert.ok(args[0].endsWith("claude-bridge.cjs"));
assert.deepEqual(args.slice(1), ["--key-file", "/k/key", "--port", "8765", "--backend", "claude", "--public-url", "https://b.example.ts.net/v1", "--claude-command", "/usr/local/bin/claude"]);
assert.ok(!args.includes("--key"));

// ---- service files
const path = servicePath("/Users/me/.nvm/versions/node/v22/bin/node", "/opt/homebrew/bin/claude");
assert.equal(path, "/Users/me/.nvm/versions/node/v22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin");
const plist = launchdPlist("/usr/local/bin/node", ["/p/a&b/claude-bridge.cjs", "--no-qr"], "/Users/me/Library/Logs/notekit-bridge.log", path);
assert.match(plist, /<string>\/p\/a&amp;b\/claude-bridge\.cjs<\/string>/, "XML-escaped arguments");
assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
assert.match(plist, /<key>PATH<\/key><string>\/Users\/me\/\.nvm/);
const unit = systemdUnit("/usr/bin/node", ["/home/me/notekit edit/bridge/claude-bridge.cjs", "--public-url", "http://h/v1?x=100%"], "/usr/bin:/bin");
assert.match(unit, /^ExecStart="\/usr\/bin\/node" "\/home\/me\/notekit edit\/bridge\/claude-bridge\.cjs" "--public-url" "http:\/\/h\/v1\?x=100%%"$/m, "quoted, % doubled");
assert.match(unit, /^Environment="PATH=\/usr\/bin:\/bin"$/m);
assert.match(unit, /^Restart=on-failure$/m);

console.log("bridge-setup: ok");
