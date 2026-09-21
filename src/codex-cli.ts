/**
 * Runs OpenAI's Codex CLI headlessly (`codex exec --json`) and returns the
 * agent's reply. Uses the CLI's own login — a ChatGPT subscription via
 * `codex login`, or an API key — so nothing is stored in Obsidian.
 *
 * No `obsidian` imports: this is shared with the bridge server.
 */
import { runLines } from "./process";
import { type StreamEvent, textEvent, thinkingEvent } from "./stream";

export interface CodexCliConfig {
  command: string;
  /** Model override for `-m`; empty = CLI default. */
  model: string;
  cwd: string;
  onLog?: (line: string) => void;
}

interface CodexEvent {
  type: string;
  item?: { type?: string; text?: string };
  message?: string;
  error?: { message?: string } | string;
}

export async function* streamCodexCli(
  cfg: CodexCliConfig,
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  // `codex exec` has no system-prompt flag; the instructions ride along in the prompt.
  const prompt = `${system}\n\n---\n\n${user}`;
  const args = ["exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "--color", "never"];
  if (cfg.model) args.push("--model", cfg.model);
  args.push("-"); // read the prompt from stdin

  let gotText = false;
  let failure: string | null = null;
  const lines = runLines(cfg.command || "codex", args, prompt, { cwd: cfg.cwd, signal, onStderr: cfg.onLog });

  for (;;) {
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
    let ev: CodexEvent;
    try {
      ev = JSON.parse(next.value) as CodexEvent;
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

/** Quick check used by the settings “Test” button and the setup wizard. */
export async function testCodexCli(cfg: CodexCliConfig): Promise<string> {
  const version = await collect(cfg.command || "codex", ["--version"], cfg.cwd);
  if (version.code !== 0) throw new Error(`“${cfg.command}” failed: ${version.stderr.trim() || `exit ${version.code}`}`);
  const status = await collect(cfg.command || "codex", ["login", "status"], cfg.cwd);
  const loggedIn = status.code === 0;
  const detail = (status.out + " " + status.stderr).trim().split("\n")[0] ?? "";
  return `${version.out.trim()}; ${loggedIn ? `logged in${detail ? ` (${detail})` : ""}` : "NOT logged in — run `codex login` in a terminal"}.`;
}

async function collect(command: string, args: string[], cwd: string): Promise<{ out: string; stderr: string; code: number | null }> {
  const lines = runLines(command, args, "", { cwd });
  let out = "";
  for (;;) {
    const n = await lines.next();
    if (n.done) return { out, stderr: n.value.stderr, code: n.value.code };
    out += n.value + "\n";
  }
}
