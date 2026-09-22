#!/usr/bin/env node
/* Claude Code / Codex bridge for the Notekit Edit Obsidian plugin. Source: src/bridge.ts */
"use strict";

// src/bridge.ts
var import_node_http = require("node:http");
var import_node_os = require("node:os");

// src/process.ts
function nodeRequire(id) {
  const r = globalThis.require;
  if (typeof r !== "function") {
    throw new Error("Local agents can only run on desktop. On mobile, point an OpenAI-compatible agent at the bridge server instead.");
  }
  return r(id);
}
function extraPathDirs() {
  const os = nodeRequire("os");
  const path = nodeRequire("path");
  const fs = nodeRequire("fs");
  const home = os.homedir();
  const dirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(home, ".local", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".volta", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".claude", "local"),
    path.join(home, "AppData", "Roaming", "npm")
  ];
  for (const base of [path.join(home, ".nvm", "versions", "node"), path.join(home, ".fnm", "node-versions")]) {
    try {
      for (const v of fs.readdirSync(base)) {
        dirs.push(path.join(base, v, "bin"), path.join(base, v, "installation", "bin"));
      }
    } catch {
    }
  }
  return dirs;
}
function augmentedEnv(extra = {}) {
  const path = nodeRequire("path");
  const env = { ...nodeRequire("process").env };
  const current = env.PATH ?? env.Path ?? "";
  const parts = new Set(current.split(path.delimiter).filter(Boolean));
  for (const d of extraPathDirs()) parts.add(d);
  env.PATH = Array.from(parts).join(path.delimiter);
  for (const k of Object.keys(env)) {
    if (k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_")) delete env[k];
  }
  return { ...env, ...extra };
}
function resolveCommand(command) {
  const path = nodeRequire("path");
  const fs = nodeRequire("fs");
  if (command.includes("/") || command.includes("\\")) return expandHome(command);
  const exts = nodeRequire("process").platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  for (const dir of augmentedEnv().PATH.split(path.delimiter)) {
    for (const ext of exts) {
      const candidate = path.join(dir, command + ext);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
      }
    }
  }
  return command;
}
function expandHome(p) {
  if (!p.startsWith("~")) return p;
  return nodeRequire("os").homedir() + p.slice(1);
}
function splitCommandLine(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while (m = re.exec(line)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}
function spawnLineProcess(command, args, opts2 = {}) {
  const cp = nodeRequire("child_process");
  const resolved = resolveCommand(command);
  const child = cp.spawn(resolved, args, {
    cwd: opts2.cwd,
    env: augmentedEnv(opts2.env),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: nodeRequire("process").platform === "win32" && /\.(cmd|bat)$/i.test(resolved)
  });
  const lineCbs = [];
  const errCbs = [];
  const exitCbs = [];
  let exited = false;
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line.trim()) for (const cb of lineCbs) cb(line);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    for (const cb of errCbs) cb(chunk);
  });
  child.on("error", (err) => {
    exited = true;
    for (const cb of errCbs) cb(`spawn error: ${err.message}
`);
    for (const cb of exitCbs) cb(-1, null);
  });
  child.on("exit", (code, signal) => {
    exited = true;
    if (buf.trim()) for (const cb of lineCbs) cb(buf);
    buf = "";
    for (const cb of exitCbs) cb(code, signal);
  });
  return {
    write: (line) => {
      if (!exited) child.stdin.write(line.endsWith("\n") ? line : line + "\n");
    },
    endInput: () => {
      try {
        child.stdin.end();
      } catch {
      }
    },
    onLine: (cb) => void lineCbs.push(cb),
    onStderr: (cb) => void errCbs.push(cb),
    onExit: (cb) => void exitCbs.push(cb),
    kill: () => {
      if (!exited) {
        try {
          child.stdin.end();
        } catch {
        }
        child.kill();
      }
    },
    get pid() {
      return child.pid;
    },
    get exited() {
      return exited;
    }
  };
}
async function* runLines(command, args, stdin, opts2 = {}) {
  const proc = spawnLineProcess(command, args, opts2);
  const queue = [];
  let stderr = "";
  let done = null;
  let wake = null;
  const notify = () => {
    wake?.();
    wake = null;
  };
  proc.onLine((l) => {
    queue.push(l);
    notify();
  });
  proc.onStderr((t) => {
    stderr += t;
    opts2.onStderr?.(t);
  });
  proc.onExit((code) => {
    done = { code };
    notify();
  });
  const onAbort = () => proc.kill();
  opts2.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    proc.write(stdin);
    proc.endInput();
    for (; ; ) {
      while (queue.length) yield queue.shift();
      if (done) break;
      await new Promise((r) => wake = r);
    }
    return { code: done?.code ?? null, stderr };
  } finally {
    opts2.signal?.removeEventListener("abort", onAbort);
    proc.kill();
  }
}

// src/acp.ts
var AcpAgent = class {
  constructor(cfg) {
    this.cfg = cfg;
    this.proc = null;
    this.ready = null;
    this.nextId = 1;
    this.pending = /* @__PURE__ */ new Map();
    this.chunkListeners = /* @__PURE__ */ new Map();
    this.sessions = [];
    this.idleTimer = null;
    this.agentName = "";
  }
  /** Runs one prompt turn, streaming text/thinking chunks; resolves with the agent's stop reason. */
  async prompt(text, onChunk, signal) {
    await this.ensureStarted();
    const session = await this.acquireSession();
    this.chunkListeners.set(session.id, onChunk);
    const onAbort = () => this.notify("session/cancel", { sessionId: session.id });
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await this.request("session/prompt", {
        sessionId: session.id,
        prompt: [{ type: "text", text }]
      });
      return res?.stopReason ?? "end_turn";
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.chunkListeners.delete(session.id);
      session.busy = false;
      this.touch();
    }
  }
  /** Spawns the process and runs `initialize`; used by prompt() and the settings “Test” button. */
  async ensureStarted() {
    if (this.proc && !this.proc.exited && this.ready) return this.ready;
    this.ready = this.start();
    return this.ready;
  }
  shutdown() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const proc = this.proc;
    this.proc = null;
    this.ready = null;
    this.sessions = [];
    for (const p of this.pending.values()) p.reject(new Error("Agent shut down."));
    this.pending.clear();
    proc?.kill();
  }
  async start() {
    const [command, ...args] = splitCommandLine(this.cfg.command);
    if (!command) throw new Error("No agent command configured.");
    const proc = spawnLineProcess(command, args, { cwd: this.cfg.cwd, env: this.cfg.env });
    this.proc = proc;
    this.sessions = [];
    let stderrTail = "";
    proc.onStderr((t) => {
      stderrTail = (stderrTail + t).slice(-2e3);
      this.cfg.onLog?.(t.trimEnd());
    });
    proc.onLine((line) => this.handleLine(line));
    proc.onExit((code) => {
      if (this.proc !== proc) return;
      this.proc = null;
      this.ready = null;
      this.sessions = [];
      const why = stderrTail.trim().split("\n").slice(-3).join(" ").trim();
      const err = new Error(`Agent process exited (code ${code ?? "?"})${why ? `: ${why}` : ""}`);
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    });
    const init = await this.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "notekit-edit", title: "Notekit Edit", version: "0.2.1" }
    });
    this.agentName = init?.agentInfo?.title ?? init?.agentInfo?.name ?? "";
    const methods = init?.authMethods ?? [];
    if (methods.length) {
      try {
        await this.request("authenticate", { methodId: methods[0].id });
      } catch (e) {
        throw new Error(`Agent requires authentication (${methods.map((m) => m.name ?? m.id).join(", ")}): ${e.message}`);
      }
    }
    this.touch();
  }
  async acquireSession() {
    const idle = this.sessions.find((s) => !s.busy);
    if (idle) {
      idle.busy = true;
      return idle;
    }
    const res = await this.request("session/new", { cwd: this.cfg.cwd, mcpServers: [] });
    const session = { id: res.sessionId, busy: true };
    this.sessions.push(session);
    return session;
  }
  touch() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const ms = this.cfg.idleMs ?? 10 * 60 * 1e3;
    if (ms > 0) {
      this.idleTimer = setTimeout(() => {
        if (this.sessions.every((s) => !s.busy)) this.shutdown();
        else this.touch();
      }, ms);
    }
  }
  handleLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      this.cfg.onLog?.(`non-JSON output: ${line.slice(0, 200)}`);
      return;
    }
    if (msg.id !== void 0 && msg.method === void 0) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || `JSON-RPC error ${msg.error.code}`));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === "session/update") {
      const { sessionId, update } = msg.params ?? {};
      if (update?.content?.type === "text" && typeof update.content.text === "string") {
        if (update.sessionUpdate === "agent_message_chunk") {
          this.chunkListeners.get(sessionId)?.({ type: "text", text: update.content.text });
        } else if (update.sessionUpdate === "agent_thought_chunk") {
          this.chunkListeners.get(sessionId)?.({ type: "thinking", text: update.content.text });
        }
      }
      return;
    }
    if (msg.id !== void 0 && msg.method) {
      this.handleAgentRequest(msg.id, msg.method, msg.params);
    }
  }
  /** Requests from the agent to us: permissions, fs, terminal. We only ever answer permissions. */
  handleAgentRequest(id, method, params) {
    if (method === "session/request_permission") {
      const { options = [], toolCall } = params ?? {};
      const want = this.cfg.allowTools ? ["allow_once", "allow_always"] : ["reject_once", "reject_always"];
      const pick = options.find((o) => want.includes(o.kind)) ?? options.find((o) => !this.cfg.allowTools && /reject/.test(o.kind));
      const outcome = pick ? { outcome: "selected", optionId: pick.optionId } : { outcome: "cancelled" };
      this.cfg.onLog?.(`permission request for ${toolCall?.title ?? "a tool"} \u2192 ${pick?.kind ?? "cancelled"}`);
      this.respond(id, { outcome });
      return;
    }
    this.respondError(id, -32601, `Method not supported by this client: ${method}`);
  }
  request(method, params) {
    const proc = this.proc;
    if (!proc || proc.exited) return Promise.reject(new Error("Agent process is not running."));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      proc.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }
  notify(method, params) {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", method, params }));
  }
  respond(id, result) {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", id, result }));
  }
  respondError(id, code, message) {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
  }
};

// src/stream.ts
var textEvent = (text) => ({ type: "text", text });
var thinkingEvent = (text) => ({ type: "thinking", text });

// src/claude-cli.ts
async function* streamClaudeCli(cfg, system, user, signal) {
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--tools",
    "",
    "--no-session-persistence",
    "--system-prompt",
    system
  ];
  if (cfg.model) args.push("--model", cfg.model);
  if (cfg.effort) args.push("--effort", cfg.effort);
  let gotText = false;
  let resultError = null;
  const lines = runLines(cfg.command || "claude", args, user, { cwd: cfg.cwd, signal, onStderr: cfg.onLog });
  for (; ; ) {
    const next = await lines.next();
    if (next.done) {
      const { code, stderr } = next.value;
      if (signal.aborted) return;
      if (resultError) throw new Error(resultError);
      if (code !== 0 && !gotText) {
        const tail = stderr.trim().split("\n").slice(-2).join(" ");
        throw new Error(`Claude Code exited with code ${code}${tail ? `: ${tail}` : ""}`);
      }
      if (!gotText) throw new Error("Claude Code returned no text.");
      return;
    }
    let msg;
    try {
      msg = JSON.parse(next.value);
    } catch {
      continue;
    }
    if (msg.type === "stream_event") {
      const ev = msg.event;
      if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
        gotText = true;
        yield textEvent(ev.delta.text);
      } else if (ev?.type === "content_block_delta" && ev.delta?.type === "thinking_delta" && ev.delta.thinking) {
        yield thinkingEvent(ev.delta.thinking);
      }
    } else if (msg.type === "result") {
      if (msg.is_error) {
        resultError = msg.result || `Claude Code error (${msg.subtype ?? "unknown"})`;
      } else if (!gotText && msg.result) {
        gotText = true;
        yield textEvent(msg.result);
      }
    }
  }
}

// src/codex-cli.ts
async function* streamCodexCli(cfg, system, user, signal) {
  const prompt = `${system}

---

${user}`;
  const args = ["exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "--color", "never"];
  if (cfg.model) args.push("--model", cfg.model);
  args.push("-");
  let gotText = false;
  let failure = null;
  const lines = runLines(cfg.command || "codex", args, prompt, { cwd: cfg.cwd, signal, onStderr: cfg.onLog });
  for (; ; ) {
    const next = await lines.next();
    if (next.done) {
      const { code, stderr } = next.value;
      if (signal.aborted) return;
      if (failure) throw new Error(failure);
      if (code !== 0 && !gotText) {
        const tail = stderr.trim().split("\n").slice(-2).join(" ");
        throw new Error(`Codex exited with code ${code}${tail ? `: ${tail}` : ""}`);
      }
      if (!gotText) throw new Error("Codex returned no text.");
      return;
    }
    let ev;
    try {
      ev = JSON.parse(next.value);
    } catch {
      continue;
    }
    if (ev.type === "item.completed" && ev.item?.type === "agent_message" && ev.item.text) {
      gotText = true;
      yield textEvent(ev.item.text);
    } else if (ev.type === "item.completed" && ev.item?.type === "reasoning" && ev.item.text) {
      yield thinkingEvent(ev.item.text);
    } else if (ev.type === "error" || ev.type === "turn.failed") {
      failure = ev.message ?? (typeof ev.error === "string" ? ev.error : ev.error?.message) ?? "Codex reported an error.";
    }
  }
}

// src/bridge.ts
globalThis.require ??= require;
function parseArgs(argv) {
  const o = {
    key: process.env.BRIDGE_KEY ?? "",
    port: 8765,
    host: "0.0.0.0",
    backend: "claude",
    acpCommand: "npx -y @agentclientprotocol/claude-agent-acp",
    cwd: (0, import_node_os.homedir)(),
    allowTools: false,
    claudeCommand: "claude",
    codexCommand: "codex"
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i] ?? "";
    switch (a) {
      case "--key":
        o.key = v();
        break;
      case "--port":
        o.port = Number(v());
        break;
      case "--host":
        o.host = v();
        break;
      case "--backend":
        o.backend = v();
        break;
      case "--acp-command":
        o.acpCommand = v();
        break;
      case "--cwd":
        o.cwd = v();
        break;
      case "--allow-tools":
        o.allowTools = true;
        break;
      case "--claude-command":
        o.claudeCommand = v();
        break;
      case "--codex-command":
        o.codexCommand = v();
        break;
      case "-h":
      case "--help":
        console.log("Usage: node claude-bridge.cjs --key <secret> [--port 8765] [--host 0.0.0.0] [--backend claude|codex|acp] [--acp-command CMD] [--cwd DIR] [--allow-tools]");
        process.exit(0);
    }
  }
  if (!o.key) {
    console.error("Refusing to start without --key (or BRIDGE_KEY): anyone on the network could otherwise use your subscription.");
    process.exit(1);
  }
  return o;
}
var opts = parseArgs(process.argv.slice(2));
var log = (line) => console.error(`[bridge] ${line}`);
var acp = opts.backend === "acp" ? new AcpAgent({ command: opts.acpCommand, cwd: opts.cwd, allowTools: opts.allowTools, idleMs: 30 * 60 * 1e3, onLog: log }) : null;
function textOf(c) {
  return typeof c === "string" ? c : c.map((p) => p.text ?? "").join("");
}
async function* generate(model, system, user, signal) {
  if (opts.backend === "acp" && acp) {
    const queue = [];
    let done = null;
    let wake = null;
    const notify = () => {
      wake?.();
      wake = null;
    };
    acp.prompt(`${system}

---

${user}`, (c) => {
      queue.push(c);
      notify();
    }, signal).then(() => done = {}, (err) => done = { err }).finally(notify);
    for (; ; ) {
      while (queue.length) yield queue.shift();
      if (done) break;
      await new Promise((r) => wake = r);
    }
    if (done.err) throw done.err;
    return;
  }
  if (opts.backend === "codex") {
    yield* streamCodexCli({ command: opts.codexCommand, model: model === "codex" ? "" : model, cwd: opts.cwd, onLog: log }, system, user, signal);
    return;
  }
  const alias = ["claude", "default", ""].includes(model) ? "" : model;
  yield* streamClaudeCli({ command: opts.claudeCommand, model: alias, cwd: opts.cwd, onLog: log }, system, user, signal);
}
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => data += c);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
var server = (0, import_node_http.createServer)(async (req, res) => {
  cors(res);
  const url = req.url ?? "/";
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  if (url === "/health") return json(res, 200, { ok: true, backend: opts.backend });
  if (req.headers.authorization !== `Bearer ${opts.key}`) return json(res, 401, { error: { message: "Invalid bridge key." } });
  if (req.method === "GET" && url.startsWith("/v1/models")) {
    const ids = opts.backend === "codex" ? ["codex"] : opts.backend === "acp" ? ["acp"] : ["claude", "opus", "sonnet", "haiku"];
    return json(res, 200, { object: "list", data: ids.map((id) => ({ id, object: "model", owned_by: "bridge" })) });
  }
  if (req.method === "POST" && url.startsWith("/v1/chat/completions")) {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: { message: "Invalid JSON body." } });
    }
    const messages = body.messages ?? [];
    const system = messages.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n\n");
    const user = messages.filter((m) => m.role !== "system").map((m) => textOf(m.content)).join("\n\n");
    const model = body.model ?? "claude";
    const id = `chatcmpl-${Date.now().toString(36)}`;
    const ac = new AbortController();
    req.on("close", () => ac.abort());
    log(`${req.socket.remoteAddress} \u2192 ${model} (${user.length} chars, stream=${Boolean(body.stream)})`);
    if (body.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}

`);
      try {
        for await (const ev of generate(model, system, user, ac.signal)) {
          const delta = ev.type === "text" ? { content: ev.text } : { reasoning_content: ev.text };
          send({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta, finish_reason: null }] });
        }
        send({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
      } catch (err) {
        send({ error: { message: err.message } });
      }
      res.write("data: [DONE]\n\n");
      return res.end();
    }
    try {
      let text = "";
      let reasoning = "";
      for await (const ev of generate(model, system, user, ac.signal)) {
        if (ev.type === "text") text += ev.text;
        else reasoning += ev.text;
      }
      const message = { role: "assistant", content: text };
      if (reasoning) message.reasoning_content = reasoning;
      return json(res, 200, { id, object: "chat.completion", model, choices: [{ index: 0, message, finish_reason: "stop" }] });
    } catch (err) {
      return json(res, 500, { error: { message: err.message } });
    }
  }
  json(res, 404, { error: { message: "Not found. Endpoints: GET /v1/models, POST /v1/chat/completions" } });
});
server.listen(opts.port, opts.host, () => {
  log(`listening on http://${opts.host}:${opts.port}/v1 (backend: ${opts.backend}, cwd: ${opts.cwd})`);
  log(`In Obsidian: add an "OpenAI-compatible" agent with base URL http://<this-machine>:${opts.port}/v1, the --key as API key, model "${opts.backend === "codex" ? "codex" : opts.backend === "acp" ? "acp" : "claude"}".`);
});
process.on("SIGINT", () => {
  acp?.shutdown();
  server.close();
  process.exit(0);
});
