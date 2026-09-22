/**
 * Minimal Agent Client Protocol (ACP) client over stdio — enough to run a
 * prompt turn against any ACP agent (claude-agent-acp, gemini-cli, codex-acp, …)
 * and stream its text back. Spec: https://agentclientprotocol.com
 *
 * No `obsidian` imports: this is shared with the bridge server.
 */
import { type LineProcess, spawnLineProcess, splitCommandLine } from "./process";
import type { StreamEvent } from "./stream";

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface InitializeResult {
  agentInfo?: { name?: string; title?: string };
  authMethods?: Array<{ id: string; name?: string }>;
}

interface SessionUpdateParams {
  sessionId: string;
  update?: { sessionUpdate?: string; content?: { type?: string; text?: string } };
}

interface PermissionParams {
  options?: Array<{ optionId: string; kind: string }>;
  toolCall?: { title?: string };
}

export interface AcpAgentConfig {
  /** Full command line, e.g. `npx @agentclientprotocol/claude-agent-acp` */
  command: string;
  cwd: string;
  env?: Record<string, string>;
  /** Let the agent run tools (file reads, shell…) by auto-approving permission requests. */
  allowTools: boolean;
  /** Kill the agent process after this long without work. */
  idleMs?: number;
  onLog?: (line: string) => void;
}

interface Session {
  id: string;
  busy: boolean;
}

/**
 * Owns one agent process and a small pool of sessions. Spawning + `session/new`
 * take a few seconds with Claude Code, so both are kept alive between edits.
 */
export class AcpAgent {
  private proc: LineProcess | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private chunkListeners = new Map<string, (ev: StreamEvent) => void>();
  private sessions: Session[] = [];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  agentName = "";

  constructor(private cfg: AcpAgentConfig) {}

  /** Runs one prompt turn, streaming text/thinking chunks; resolves with the agent's stop reason. */
  async prompt(text: string, onChunk: (ev: StreamEvent) => void, signal?: AbortSignal): Promise<string> {
    await this.ensureStarted();
    const session = await this.acquireSession();
    this.chunkListeners.set(session.id, onChunk);
    const onAbort = () => this.notify("session/cancel", { sessionId: session.id });
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = (await this.request("session/prompt", {
        sessionId: session.id,
        prompt: [{ type: "text", text }],
      })) as { stopReason?: string } | undefined;
      return res?.stopReason ?? "end_turn";
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.chunkListeners.delete(session.id);
      session.busy = false;
      this.touch();
    }
  }

  /** Spawns the process and runs `initialize`; used by prompt() and the settings “Test” button. */
  async ensureStarted(): Promise<void> {
    if (this.proc && !this.proc.exited && this.ready) return this.ready;
    this.ready = this.start();
    return this.ready;
  }

  shutdown(): void {
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

  private async start(): Promise<void> {
    const [command, ...args] = splitCommandLine(this.cfg.command);
    if (!command) throw new Error("No agent command configured.");
    const proc = spawnLineProcess(command, args, { cwd: this.cfg.cwd, env: this.cfg.env });
    this.proc = proc;
    this.sessions = [];
    let stderrTail = "";
    proc.onStderr((t) => {
      stderrTail = (stderrTail + t).slice(-2000);
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

    const init = (await this.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "obsidianize-edit", title: "Obsidianize Edit", version: "0.2.0" },
    })) as InitializeResult | undefined;
    this.agentName = init?.agentInfo?.title ?? init?.agentInfo?.name ?? "";
    const methods = init?.authMethods ?? [];
    if (methods.length) {
      // Agents that need a login advertise it here; try the first method and surface a
      // readable error if it doesn't succeed (e.g. "run `claude /login` first").
      try {
        await this.request("authenticate", { methodId: methods[0].id });
      } catch (e) {
        throw new Error(`Agent requires authentication (${methods.map((m) => m.name ?? m.id).join(", ")}): ${(e as Error).message}`);
      }
    }
    this.touch();
  }

  private async acquireSession(): Promise<Session> {
    const idle = this.sessions.find((s) => !s.busy);
    if (idle) {
      idle.busy = true;
      return idle;
    }
    const res = (await this.request("session/new", { cwd: this.cfg.cwd, mcpServers: [] })) as { sessionId: string };
    const session: Session = { id: res.sessionId, busy: true };
    this.sessions.push(session);
    return session;
  }

  private touch(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const ms = this.cfg.idleMs ?? 10 * 60 * 1000;
    if (ms > 0) {
      this.idleTimer = setTimeout(() => {
        if (this.sessions.every((s) => !s.busy)) this.shutdown();
        else this.touch();
      }, ms);
    }
  }

  private handleLine(line: string): void {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line) as JsonRpcMessage;
    } catch {
      this.cfg.onLog?.(`non-JSON output: ${line.slice(0, 200)}`);
      return;
    }
    if (msg.id !== undefined && msg.method === undefined) {
      // Response to one of our requests.
      const p = this.pending.get(msg.id as number);
      if (!p) return;
      this.pending.delete(msg.id as number);
      if (msg.error) p.reject(new Error(msg.error.message || `JSON-RPC error ${msg.error.code}`));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === "session/update") {
      const { sessionId, update } = (msg.params ?? {}) as SessionUpdateParams;
      if (update?.content?.type === "text" && typeof update.content.text === "string") {
        if (update.sessionUpdate === "agent_message_chunk") {
          this.chunkListeners.get(sessionId)?.({ type: "text", text: update.content.text });
        } else if (update.sessionUpdate === "agent_thought_chunk") {
          this.chunkListeners.get(sessionId)?.({ type: "thinking", text: update.content.text });
        }
      }
      return;
    }
    if (msg.id !== undefined && msg.method) {
      this.handleAgentRequest(msg.id, msg.method, msg.params);
    }
  }

  /** Requests from the agent to us: permissions, fs, terminal. We only ever answer permissions. */
  private handleAgentRequest(id: number | string, method: string, params: unknown): void {
    if (method === "session/request_permission") {
      const { options = [], toolCall } = (params ?? {}) as PermissionParams;
      const want = this.cfg.allowTools ? ["allow_once", "allow_always"] : ["reject_once", "reject_always"];
      const pick = options.find((o) => want.includes(o.kind)) ?? options.find((o) => !this.cfg.allowTools && /reject/.test(o.kind));
      const outcome = pick ? { outcome: "selected", optionId: pick.optionId } : { outcome: "cancelled" };
      this.cfg.onLog?.(`permission request for ${toolCall?.title ?? "a tool"} → ${pick?.kind ?? "cancelled"}`);
      this.respond(id, { outcome });
      return;
    }
    this.respondError(id, -32601, `Method not supported by this client: ${method}`);
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const proc = this.proc;
    if (!proc || proc.exited) return Promise.reject(new Error("Agent process is not running."));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      proc.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  private notify(method: string, params: unknown): void {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", method, params }));
  }

  private respond(id: number | string, result: unknown): void {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", id, result }));
  }

  private respondError(id: number | string, code: number, message: string): void {
    this.proc?.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
  }
}
