/**
 * Claude Code / Codex bridge: a tiny OpenAI-compatible HTTP server that runs
 * the locally logged-in CLI (subscription auth) so that Obsidian on a phone —
 * or on another computer — can use it as an "OpenAI-compatible" agent.
 *
 *   node bridge/claude-bridge.cjs --key <secret> [--port 8765] [--host 0.0.0.0]
 *        [--backend claude|codex|acp] [--acp-command "npx -y @agentclientprotocol/claude-agent-acp"]
 *        [--cwd /path/for/agent] [--allow-tools] [--public-url URL] [--no-qr]
 *
 * Endpoints: GET /v1/models, POST /v1/chat/completions (stream: true → SSE), GET /health
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir, networkInterfaces } from "node:os";
import { AcpAgent } from "./acp";
import { renderQr } from "./qr-terminal";
import { buildSetupLink } from "./setup-link";
import { streamClaudeCli } from "./claude-cli";
import { streamCodexCli } from "./codex-cli";
import type { StreamEvent } from "./stream";

(globalThis as { require?: unknown }).require ??= require;

interface Options {
  key: string;
  port: number;
  host: string;
  backend: "claude" | "codex" | "acp";
  acpCommand: string;
  cwd: string;
  allowTools: boolean;
  claudeCommand: string;
  codexCommand: string;
  /** Base URL phones should use, when auto-detection picks the wrong address (VPN, reverse proxy). */
  publicUrl: string;
  /** Print the setup link and QR code on start. */
  qr: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    key: process.env.BRIDGE_KEY ?? "",
    port: 8765,
    host: "0.0.0.0",
    backend: "claude",
    acpCommand: "npx -y @agentclientprotocol/claude-agent-acp",
    cwd: homedir(),
    allowTools: false,
    claudeCommand: "claude",
    codexCommand: "codex",
    publicUrl: "",
    qr: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i] ?? "";
    switch (a) {
      case "--key": o.key = v(); break;
      case "--port": o.port = Number(v()); break;
      case "--host": o.host = v(); break;
      case "--backend": o.backend = v() as Options["backend"]; break;
      case "--acp-command": o.acpCommand = v(); break;
      case "--cwd": o.cwd = v(); break;
      case "--allow-tools": o.allowTools = true; break;
      case "--claude-command": o.claudeCommand = v(); break;
      case "--codex-command": o.codexCommand = v(); break;
      case "--public-url": o.publicUrl = v().replace(/\/+$/, ""); break;
      case "--no-qr": o.qr = false; break;
      case "-h":
      case "--help":
        console.log("Usage: node claude-bridge.cjs --key <secret> [--port 8765] [--host 0.0.0.0] [--backend claude|codex|acp] [--acp-command CMD] [--cwd DIR] [--allow-tools] [--public-url URL] [--no-qr]");
        process.exit(0);
    }
  }
  if (!o.key) {
    console.error("Refusing to start without --key (or BRIDGE_KEY): anyone on the network could otherwise use your subscription.");
    process.exit(1);
  }
  return o;
}

const opts = parseArgs(process.argv.slice(2));
const log = (line: string) => console.error(`[bridge] ${line}`);
const acp = opts.backend === "acp" ? new AcpAgent({ command: opts.acpCommand, cwd: opts.cwd, allowTools: opts.allowTools, idleMs: 30 * 60 * 1000, onLog: log }) : null;

interface ChatMessage { role: string; content: string | Array<{ type: string; text?: string }> }

function textOf(c: ChatMessage["content"]): string {
  return typeof c === "string" ? c : c.map((p) => p.text ?? "").join("");
}

async function* generate(model: string, system: string, user: string, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  if (opts.backend === "acp" && acp) {
    const queue: StreamEvent[] = [];
    let done: { err?: Error } | null = null;
    let wake: (() => void) | null = null;
    const notify = () => { wake?.(); wake = null; };
    acp.prompt(`${system}\n\n---\n\n${user}`, (c) => { queue.push(c); notify(); }, signal)
      .then(() => (done = {}), (err: Error) => (done = { err }))
      .finally(notify);
    for (;;) {
      while (queue.length) yield queue.shift()!;
      if (done) break;
      await new Promise<void>((r) => (wake = r));
    }
    if ((done as { err?: Error }).err) throw (done as { err?: Error }).err;
    return;
  }
  if (opts.backend === "codex") {
    yield* streamCodexCli({ command: opts.codexCommand, model: model === "codex" ? "" : model, cwd: opts.cwd, onLog: log }, system, user, signal);
    return;
  }
  const alias = ["claude", "default", ""].includes(model) ? "" : model;
  yield* streamClaudeCli({ command: opts.claudeCommand, model: alias, cwd: opts.cwd, onLog: log }, system, user, signal);
}

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
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
    let body: { model?: string; messages?: ChatMessage[]; stream?: boolean };
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
    log(`${req.socket.remoteAddress} → ${model} (${user.length} chars, stream=${Boolean(body.stream)})`);

    if (body.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
      try {
        for await (const ev of generate(model, system, user, ac.signal)) {
          const delta = ev.type === "text" ? { content: ev.text } : { reasoning_content: ev.text };
          send({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta, finish_reason: null }] });
        }
        send({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
      } catch (err) {
        send({ error: { message: (err as Error).message } });
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
      const message: Record<string, string> = { role: "assistant", content: text };
      if (reasoning) message.reasoning_content = reasoning;
      return json(res, 200, { id, object: "chat.completion", model, choices: [{ index: 0, message, finish_reason: "stop" }] });
    } catch (err) {
      return json(res, 500, { error: { message: (err as Error).message } });
    }
  }

  json(res, 404, { error: { message: "Not found. Endpoints: GET /v1/models, POST /v1/chat/completions" } });
});

const MODEL = opts.backend === "codex" ? "codex" : opts.backend === "acp" ? "acp" : "claude";
const AGENT_NAME = opts.backend === "codex" ? "Codex bridge" : opts.backend === "acp" ? "ACP bridge" : "Claude Code bridge";

/** Base URLs a phone could use to reach this bridge, best guess first. */
function candidateBaseUrls(): string[] {
  if (opts.publicUrl) return [opts.publicUrl];
  if (opts.host !== "0.0.0.0" && opts.host !== "::") return [`http://${opts.host}:${opts.port}/v1`];
  const rank = (ip: string) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) ? 3 : 4);
  const ips: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) ips.push(a.address);
  }
  ips.sort((a, b) => rank(a) - rank(b));
  return (ips.length ? ips : ["127.0.0.1"]).map((ip) => `http://${ip}:${opts.port}/v1`);
}

function printSetupLinks(): void {
  const urls = candidateBaseUrls();
  const links = urls.map((url) => buildSetupLink({ type: "openai", url, key: opts.key, model: MODEL, name: AGENT_NAME }));
  const out = process.stdout;
  out.write("\nSet up Notekit Edit on a phone: scan this QR code with the phone's camera (it opens Obsidian).\n");
  out.write("It contains the bridge key: anyone who sees it can use your subscription through this bridge.\n\n");
  if (out.isTTY) out.write(renderQr(links[0]) + "\n\n");
  out.write(`Setup link (${urls[0]}):\n${links[0]}\n`);
  if (links.length > 1) {
    out.write("\nOther addresses of this computer, if the phone cannot reach the one above:\n");
    for (const l of links.slice(1)) out.write(`${l}\n`);
  }
  out.write("\nWrong address? Restart with --public-url http://<reachable-host>:" + opts.port + "/v1. Hide this with --no-qr.\n\n");
}

server.listen(opts.port, opts.host, () => {
  log(`listening on http://${opts.host}:${opts.port}/v1 (backend: ${opts.backend}, cwd: ${opts.cwd})`);
  log(`In Obsidian: add an "OpenAI-compatible" agent with base URL http://<this-machine>:${opts.port}/v1, the --key as API key, model "${MODEL}".`);
  if (opts.qr) printSetupLinks();
});

process.on("SIGINT", () => {
  acp?.shutdown();
  server.close();
  process.exit(0);
});
