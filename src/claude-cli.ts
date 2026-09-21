/**
 * Runs Claude Code headlessly (`claude -p`) with tools disabled and streams the
 * reply. Uses whatever login the CLI has — a Claude Pro/Max subscription or an
 * API key — so no key needs to be stored in Obsidian.
 *
 * No `obsidian` imports: this is shared with the bridge server.
 */
import { runLines } from "./process";
import { type StreamEvent, textEvent, thinkingEvent } from "./stream";

export interface ClaudeCliConfig {
  /** Path or name of the CLI, normally just `claude`. */
  command: string;
  /** Model alias or id, e.g. `opus`, `sonnet`, `claude-opus-5`. Empty = CLI default. */
  model: string;
  effort?: string;
  cwd: string;
  onLog?: (line: string) => void;
}

interface StreamLine {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  event?: { type: string; delta?: { type: string; text?: string; thinking?: string }; message?: unknown };
}

export async function* streamClaudeCli(
  cfg: ClaudeCliConfig,
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--tools", "",
    "--no-session-persistence",
    "--system-prompt", system,
  ];
  if (cfg.model) args.push("--model", cfg.model);
  if (cfg.effort) args.push("--effort", cfg.effort);

  let gotText = false;
  let resultError: string | null = null;
  const lines = runLines(cfg.command || "claude", args, user, { cwd: cfg.cwd, signal, onStderr: cfg.onLog });

  for (;;) {
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
    let msg: StreamLine;
    try {
      msg = JSON.parse(next.value) as StreamLine;
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
        // Older CLIs without partial messages: the full text arrives in the result.
        gotText = true;
        yield textEvent(msg.result);
      }
    }
  }
}

/** Quick check used by the settings “Test” button. */
export async function testClaudeCli(cfg: ClaudeCliConfig): Promise<string> {
  const lines = runLines(cfg.command || "claude", ["--version"], "", { cwd: cfg.cwd });
  let out = "";
  for (;;) {
    const n = await lines.next();
    if (n.done) {
      if (n.value.code !== 0) throw new Error(`“${cfg.command}” failed: ${n.value.stderr.trim() || `exit ${n.value.code}`}`);
      break;
    }
    out += n.value + " ";
  }
  const auth = runLines(cfg.command || "claude", ["auth", "status"], "", { cwd: cfg.cwd });
  let json = "";
  for (;;) {
    const n = await auth.next();
    if (n.done) break;
    json += n.value;
  }
  let who = "";
  try {
    const a = JSON.parse(json) as { loggedIn?: boolean; authMethod?: string; email?: string };
    who = a.loggedIn ? `logged in via ${a.authMethod ?? "?"}${a.email ? ` (${a.email})` : ""}` : "NOT logged in — run `claude` in a terminal and use /login";
  } catch {
    who = "auth status unknown";
  }
  return `${out.trim()}; ${who}.`;
}
