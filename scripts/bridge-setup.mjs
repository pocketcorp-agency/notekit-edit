#!/usr/bin/env node
// One-command bridge setup for the computer where the claude/codex CLI is logged in.
//
//   npm run bridge:setup                        run the bridge here and show the QR code for the phone
//   npm run bridge:setup -- --install           run it in the background at login (macOS launchd, Linux systemd)
//   npm run bridge:setup -- --pair              show the QR code again for the installed bridge
//   npm run bridge:setup -- --uninstall         remove the background service (the key file is kept)
//
// Options: --backend claude|codex|acp (claude), --port N (8765), --public-url URL,
//          --acp-command "CMD" (ACP only), --allow-tools (ACP only).
//
// The key is generated once and kept in ~/.config/notekit-bridge/key (mode 600), so the phone stays
// paired across restarts. It is passed to the bridge with --key-file, never on the command line.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const LABEL = "agency.pocketcorp.notekit-bridge";
export const SYSTEMD_UNIT = "notekit-bridge.service";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const BRIDGE = join(ROOT, "bridge", "claude-bridge.cjs");

export function parseSetupArgs(argv) {
  const o = { backend: "claude", port: 8765, publicUrl: "", acpCommand: "", allowTools: false, mode: "run" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i] ?? "";
    if (a === "--backend") o.backend = v();
    else if (a === "--port") o.port = Number(v());
    else if (a === "--public-url") o.publicUrl = v();
    else if (a === "--acp-command") o.acpCommand = v();
    else if (a === "--allow-tools") o.allowTools = true;
    else if (a === "--install") o.mode = "install";
    else if (a === "--uninstall") o.mode = "uninstall";
    else if (a === "--pair") o.mode = "pair";
    else if (a === "-h" || a === "--help") o.mode = "help";
    else throw new Error(`Unknown option ${a}. Run with --help.`);
  }
  if (!["claude", "codex", "acp"].includes(o.backend)) throw new Error(`--backend must be claude, codex or acp, not "${o.backend}".`);
  if (!Number.isInteger(o.port) || o.port < 1 || o.port > 65535) throw new Error("--port must be a number between 1 and 65535.");
  if (o.backend === "acp" && !o.acpCommand) o.acpCommand = "npx -y @agentclientprotocol/claude-agent-acp";
  return o;
}

export function configDir(home = homedir(), os = platform(), env = process.env) {
  if (os === "win32") return join(env.APPDATA || join(home, "AppData", "Roaming"), "notekit-bridge");
  return join(env.XDG_CONFIG_HOME || join(home, ".config"), "notekit-bridge");
}

/** Returns the key file path, creating a random key on first use. */
export function ensureKey(dir) {
  const file = join(dir, "key");
  if (existsSync(file) && readFileSync(file, "utf8").trim()) return { file, created: false };
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(file, randomBytes(24).toString("hex") + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
  return { file, created: true };
}

/** The bridge arguments shared by every mode. */
export function bridgeArgs(o, keyFile, commandPath) {
  const args = [BRIDGE, "--key-file", keyFile, "--port", String(o.port), "--backend", o.backend];
  if (o.publicUrl) args.push("--public-url", o.publicUrl);
  if (o.backend === "acp") args.push("--acp-command", o.acpCommand);
  if (o.allowTools) args.push("--allow-tools");
  if (commandPath && o.backend === "claude") args.push("--claude-command", commandPath);
  if (commandPath && o.backend === "codex") args.push("--codex-command", commandPath);
  return args;
}

const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// systemd: double-quote each argument, escape quotes and backslashes, and double "%" (specifier prefix).
const sq = (s) => `"${s.replace(/(["\\])/g, "\\$1").replace(/%/g, "%%")}"`;

/** PATH for the service: node's and the CLI's folders first, then the usual system folders. */
export function servicePath(nodePath, cliPath) {
  const dirs = [dirname(nodePath), cliPath ? dirname(cliPath) : "", "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
  return [...new Set(dirs.filter(Boolean))].join(":");
}

export function launchdPlist(nodePath, args, logFile, path) {
  const items = [nodePath, ...args].map((a) => `    <string>${xml(a)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${items}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${xml(path)}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(logFile)}</string>
  <key>StandardErrorPath</key><string>${xml(logFile)}</string>
</dict>
</plist>
`;
}

export function systemdUnit(nodePath, args, path) {
  return `[Unit]
Description=Notekit Edit bridge (Claude Code / Codex for Obsidian on other devices)
After=network-online.target

[Service]
Environment=${sq(`PATH=${path}`)}
ExecStart=${[nodePath, ...args].map(sq).join(" ")}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;
}

function which(cmd) {
  const r = spawnSync(platform() === "win32" ? "where" : "sh", platform() === "win32" ? [cmd] : ["-c", `command -v ${cmd}`], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : "";
}

/** Checks that the CLI exists and is logged in; returns its absolute path. */
function checkCli(backend) {
  if (backend === "acp") return "";
  const cmd = backend === "codex" ? "codex" : "claude";
  const path = which(cmd);
  if (!path) {
    const install = backend === "codex" ? "npm install -g @openai/codex && codex login" : "npm install -g @anthropic-ai/claude-code, then run claude and use /login";
    throw new Error(`${cmd} was not found on PATH. Install it first: ${install}`);
  }
  const args = backend === "codex" ? ["login", "status"] : ["auth", "status"];
  const r = spawnSync(path, args, { encoding: "utf8", timeout: 30000 });
  let loggedIn = r.status === 0;
  if (backend === "claude") {
    try {
      loggedIn = JSON.parse(r.stdout).loggedIn === true;
    } catch {
      /* older CLI: fall back to the exit code */
    }
  }
  if (!loggedIn) throw new Error(backend === "codex" ? "codex is not logged in. Run: codex login" : "claude is not logged in. Run claude in a terminal and use /login.");
  console.log(`✓ ${cmd} found at ${path} and logged in`);
  return path;
}

async function waitForHealth(port, seconds = 15) {
  for (let i = 0; i < seconds * 2; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  return false;
}

function run(cmd, args, allowFail = false) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim()}`);
  return r;
}

function servicePaths(os = platform(), home = homedir()) {
  if (os === "darwin") return { file: join(home, "Library", "LaunchAgents", `${LABEL}.plist`), log: join(home, "Library", "Logs", "notekit-bridge.log") };
  if (os === "linux") return { file: join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "systemd", "user", SYSTEMD_UNIT), log: "journalctl --user -u notekit-bridge" };
  return null;
}

function uninstall() {
  const paths = servicePaths();
  if (!paths) throw new Error("Background install is available on macOS and Linux only.");
  if (platform() === "darwin") run("launchctl", ["bootout", `gui/${process.getuid()}`, paths.file], true);
  else run("systemctl", ["--user", "disable", "--now", SYSTEMD_UNIT], true);
  if (existsSync(paths.file)) rmSync(paths.file);
  if (platform() === "linux") run("systemctl", ["--user", "daemon-reload"], true);
  console.log(`✓ Background bridge removed (${paths.file}). The key is kept in ${configDir()}; delete it to unpair phones.`);
}

async function install(o, key, cliPath) {
  const paths = servicePaths();
  if (!paths) throw new Error("Background install is available on macOS and Linux only. Run without --install to start the bridge in this terminal.");
  const args = [...bridgeArgs(o, key.file, cliPath), "--no-qr"];
  mkdirSync(dirname(paths.file), { recursive: true });
  if (platform() === "darwin") {
    run("launchctl", ["bootout", `gui/${process.getuid()}`, paths.file], true);
    writeFileSync(paths.file, launchdPlist(process.execPath, args, paths.log, servicePath(process.execPath, cliPath)));
    run("launchctl", ["bootstrap", `gui/${process.getuid()}`, paths.file]);
  } else {
    writeFileSync(paths.file, systemdUnit(process.execPath, args, servicePath(process.execPath, cliPath)));
    run("systemctl", ["--user", "daemon-reload"]);
    run("systemctl", ["--user", "enable", "--now", SYSTEMD_UNIT]);
    run("systemctl", ["--user", "restart", SYSTEMD_UNIT]);
  }
  console.log(`✓ Installed ${paths.file}; the bridge now starts at login. Logs: ${paths.log}`);
  if (!(await waitForHealth(o.port))) {
    throw new Error(`The bridge did not answer on port ${o.port}. Check the logs: ${paths.log}`);
  }
  console.log(`✓ Bridge is answering on port ${o.port}`);
  pair(o, key);
}

function pair(o, key) {
  const r = spawnSync(process.execPath, [...bridgeArgs(o, key.file, ""), "--pair"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("Could not print the setup QR code.");
}

function runForeground(o, key, cliPath) {
  console.log("Starting the bridge. Keep this terminal open; press Ctrl+C to stop.\n");
  const child = spawn(process.execPath, bridgeArgs(o, key.file, cliPath), { stdio: "inherit" });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  const o = parseSetupArgs(process.argv.slice(2));
  if (o.mode === "help") {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    return;
  }
  if (o.mode === "uninstall") return uninstall();
  if (!existsSync(BRIDGE)) throw new Error(`${BRIDGE} is missing. Run npm install and npm run build first.`);
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) throw new Error(`Node 18 or newer is required (this is ${process.version}).`);

  const key = ensureKey(configDir());
  console.log(key.created ? `✓ Created a new bridge key in ${key.file}` : `✓ Using the bridge key in ${key.file}`);
  if (o.mode === "pair") return pair(o, key);
  const cliPath = checkCli(o.backend);
  if (o.mode === "install") return install(o, key, cliPath);
  runForeground(o, key, cliPath);
}

// Run only when executed directly (not when a test bundles and imports these helpers).
if (process.argv[1] && /[\\/]bridge-setup\.mjs$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  });
}
