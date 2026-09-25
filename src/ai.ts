import Anthropic from "@anthropic-ai/sdk";
import { Platform, requestUrl } from "obsidian";
import { AcpAgent } from "./acp";
import { streamClaudeCli, testClaudeCli } from "./claude-cli";
import { streamCodexCli, testCodexCli } from "./codex-cli";
import { canSpawn } from "./process";
import type { NotekitEditSettings, Provider } from "./settings";
import { type StreamEvent, textEvent, thinkingEvent } from "./stream";

/** Environment the backends need that only the plugin knows. */
export interface RuntimeContext {
  /** Absolute path of the vault (desktop); used as the working directory for local agents. */
  vaultPath: string;
  log?: (line: string) => void;
}

/** One turn of a conversation sent to an agent. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EditRequest {
  instruction: string;
  /** Selected text to rewrite; empty means "insert new text at the cursor". */
  selection: string;
  /** The rest of the note, before and after the selection/cursor. */
  before: string;
  after: string;
  fileName: string;
}

const COMMON_RULES = `- Output ONLY the text that goes into the note. No preamble, no explanation, no "Here is…", no code fences around the whole answer (unless the text itself is a fenced code block).
- Preserve and match the note's Markdown conventions: formatting, indentation, list markers, headings, [[wikilinks]], tags and callouts.
- Write in the same language as the note unless asked otherwise.
- The whole note is provided so you understand the context; never repeat parts of it that are outside your output.
- Do not use tools, run commands or touch files: this is a pure writing task.`;

const EDIT_PROMPT = `You are an inline editing assistant inside Obsidian, a Markdown note-taking app.
The user has selected a passage in a note and left an instruction describing what should change.

Rules:
- Output ONLY the replacement for the selected passage.
${COMMON_RULES}
- Match the passage's leading and trailing whitespace/newlines so it drops back into the note cleanly.
- If the instruction is a question or asks for feedback rather than a change, return the passage unchanged followed by a blank line and a callout "> [!note] AI" containing your answer.`;

const INSERT_PROMPT = `You are an inline writing assistant inside Obsidian, a Markdown note-taking app.
The user placed the cursor somewhere in a note and left an instruction describing what to write there.

Rules:
- Output ONLY the text to insert at the cursor position (marked <cursor/>); it is inserted verbatim, nothing before or after it changes.
${COMMON_RULES}
- Continue naturally from what precedes the cursor and lead into what follows it; include leading/trailing newlines only when the surrounding text needs them.
- If the instruction is a question, answer it as a callout "> [!note] AI".`;

function buildSystem(settings: NotekitEditSettings, req: EditRequest): string {
  const base = req.selection ? EDIT_PROMPT : INSERT_PROMPT;
  const extra = settings.extraInstructions.trim();
  return extra ? `${base}\n\nAdditional instructions from the user:\n${extra}` : base;
}

function buildUserMessage(req: EditRequest): string {
  const parts: string[] = [];
  parts.push(`<note name="${req.fileName}">`);
  parts.push(`<before>\n${req.before}\n</before>`);
  if (req.selection) parts.push(`<selection>\n${req.selection}\n</selection>`);
  else parts.push(`<cursor/>`);
  parts.push(`<after>\n${req.after}\n</after>`);
  parts.push(`</note>`);
  parts.push("");
  parts.push(`<instruction>\n${req.instruction}\n</instruction>`);
  parts.push("");
  parts.push(req.selection ? "Return only the replacement for the text inside <selection>." : "Return only the text to insert at <cursor/>.");
  return parts.join("\n");
}

/**
 * Streams the replacement text for `req.selection` from the chosen agent,
 * yielding text deltas as they arrive. Throws on refusal, truncation, network
 * or API errors.
 */
export function streamEdit(
  provider: Provider,
  settings: NotekitEditSettings,
  ctx: RuntimeContext,
  req: EditRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  return streamMessages(provider, settings, ctx, buildSystem(settings, req), [{ role: "user", content: buildUserMessage(req) }], signal);
}

/**
 * Streams the agent's reply to a conversation (alternating turns, starting and ending with the
 * user). Used by the Ask AI chat; the caller builds the system prompt.
 */
export function streamChat(
  provider: Provider,
  settings: NotekitEditSettings,
  ctx: RuntimeContext,
  system: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  return streamMessages(provider, settings, ctx, system, messages, signal);
}

function streamMessages(
  provider: Provider,
  settings: NotekitEditSettings,
  ctx: RuntimeContext,
  system: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  switch (provider.type) {
    case "anthropic":
      return streamAnthropic(provider, settings, system, messages, signal);
    case "claude-code":
      requireDesktop(provider);
      return streamClaudeCli(
        { command: provider.command || "claude", model: provider.model, effort: provider.effort, cwd: ctx.vaultPath, onLog: ctx.log },
        system,
        flattenConversation(messages),
        signal,
      );
    case "codex-cli":
      requireDesktop(provider);
      return streamCodexCli({ command: provider.command || "codex", model: provider.model, cwd: ctx.vaultPath, onLog: ctx.log }, system, flattenConversation(messages), signal);
    case "acp":
      requireDesktop(provider);
      return streamAcp(provider, ctx, system, flattenConversation(messages), signal);
    default:
      return streamOpenAICompatible(provider, settings, system, messages, signal);
  }
}

/**
 * For backends that take a single prompt (the CLIs and ACP): one message is sent as it is; a longer
 * conversation becomes a transcript ending with the question to answer.
 */
export function flattenConversation(messages: ChatMessage[]): string {
  if (messages.length === 1) return messages[0].content;
  const turns = messages.map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`).join("\n\n");
  return `The conversation so far, oldest first:\n\n${turns}\n\nReply to the last user message. Write only your reply, without tags.`;
}

/** Local agents spawn processes, which needs Node; that exists only in the desktop (Electron) app. */
function requireDesktop(p: Provider): void {
  if (!Platform.isDesktopApp || !canSpawn()) {
    throw new Error(`“${p.name}” runs a local process and only works on desktop. On mobile, use a Claude Code bridge or another OpenAI-compatible agent.`);
  }
}

// ---------------------------------------------------------------------------
// ACP agents (claude-agent-acp, gemini-cli, codex-acp, …) — long-lived local process
// ---------------------------------------------------------------------------

const acpAgents = new Map<string, { signature: string; agent: AcpAgent }>();

function acpAgentFor(p: Provider, ctx: RuntimeContext): AcpAgent {
  const signature = JSON.stringify([p.command, p.allowTools, ctx.vaultPath]);
  const existing = acpAgents.get(p.id);
  if (existing && existing.signature === signature) return existing.agent;
  existing?.agent.shutdown();
  const agent = new AcpAgent({
    command: p.command,
    cwd: ctx.vaultPath,
    allowTools: p.allowTools,
    onLog: ctx.log ? (l) => ctx.log!(`[${p.name}] ${l}`) : undefined,
  });
  acpAgents.set(p.id, { signature, agent });
  return agent;
}

/** Kills every running ACP agent process (plugin unload). */
export function shutdownLocalAgents(): void {
  for (const { agent } of acpAgents.values()) agent.shutdown();
  acpAgents.clear();
}

async function* streamAcp(
  p: Provider,
  ctx: RuntimeContext,
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  if (!p.command.trim()) throw new Error(`No agent command set for “${p.name}”.`);
  const agent = acpAgentFor(p, ctx);
  // ACP has no system-prompt slot, so the instructions ride along in the prompt.
  const text = `${system}\n\n---\n\n${user}`;

  const queue: StreamEvent[] = [];
  let finished: { stop?: string; error?: Error } | null = null;
  let wake: (() => void) | null = null;
  const notify = () => {
    wake?.();
    wake = null;
  };
  agent
    .prompt(text, (chunk) => {
      queue.push(chunk);
      notify();
    }, signal)
    .then((stop) => (finished = { stop }), (error: Error) => (finished = { error }))
    .finally(notify);

  for (;;) {
    while (queue.length) yield queue.shift()!;
    if (finished) break;
    await new Promise<void>((r) => (wake = r));
  }
  const done = finished as { stop?: string; error?: Error };
  if (done.error) throw done.error;
  if (done.stop === "refusal") throw new Error("The agent declined this edit.");
  if (done.stop === "max_tokens") throw new Error("The response was cut off (max tokens).");
  if (done.stop === "cancelled" && !signal.aborted) throw new Error("The agent cancelled the turn.");
}

// ---------------------------------------------------------------------------
// Anthropic (official SDK)
// ---------------------------------------------------------------------------

function anthropicClient(p: Provider): Anthropic {
  if (!p.apiKey) throw new Error(`No API key set for “${p.name}”. Add one in the plugin settings.`);
  // The plugin runs inside Obsidian's renderer/webview, so the SDK sees a browser
  // environment; the API allows direct browser calls when this flag is set.
  return new Anthropic({
    apiKey: p.apiKey,
    baseURL: p.baseUrl || undefined,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    defaultHeaders: parseHeaders(p.headers),
  });
}

async function* streamAnthropic(
  p: Provider,
  settings: NotekitEditSettings,
  system: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  const client = anthropicClient(p);
  const isHaiku = p.model.includes("haiku");

  const stream = client.beta.messages.stream(
    {
      model: p.model,
      max_tokens: settings.maxTokens,
      system,
      messages,
      // Effort + adaptive thinking are not available on Haiku 4.5. Summarised thinking is
      // requested so the edit log can show the model's reasoning.
      ...(isHaiku ? {} : { output_config: { effort: p.effort }, thinking: { type: "adaptive" as const, display: "summarized" as const } }),
      // If a safety classifier declines, the API re-runs the request on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal },
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield textEvent(event.delta.text);
    } else if (event.type === "content_block_delta" && event.delta.type === "thinking_delta" && event.delta.thinking) {
      yield thinkingEvent(event.delta.thinking);
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    const why = final.stop_details?.explanation ?? "the request was declined";
    throw new Error(`Claude declined this edit: ${why}`);
  }
  if (final.stop_reason === "max_tokens") {
    throw new Error("The response was cut off — raise “Max output tokens” in settings or select less text.");
  }
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat completions (Hermes Agent, Ollama, LM Studio, OpenRouter, vLLM, OpenAI, …)
// ---------------------------------------------------------------------------

interface ChatChunk {
  choices?: Array<{
    delta?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null };
    message?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null };
    finish_reason?: string | null;
  }>;
  error?: { message?: string } | string;
}

function openAIHeaders(p: Provider): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream, application/json" };
  if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;
  return { ...headers, ...parseHeaders(p.headers) };
}

function openAIUrl(p: Provider, path: string): string {
  if (!p.baseUrl) throw new Error(`No base URL set for “${p.name}”.`);
  return `${p.baseUrl.replace(/\/+$/, "")}${path}`;
}

async function* streamOpenAICompatible(
  p: Provider,
  settings: NotekitEditSettings,
  system: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  if (!p.model) throw new Error(`No model set for “${p.name}”.`);
  const url = openAIUrl(p, "/chat/completions");
  const body = {
    model: p.model,
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: settings.maxTokens,
    stream: true,
  };

  let response: Response;
  try {
    // `fetch` is used on purpose: `requestUrl` cannot stream server-sent events. When the
    // browser-level request fails (CORS, mixed content) the code below falls back to `requestUrl`.
    response = await fetch(url, { method: "POST", headers: openAIHeaders(p), body: JSON.stringify(body), signal });
  } catch (err) {
    if (signal.aborted) throw err;
    // A browser-level failure before any bytes arrived is almost always CORS (the
    // remote server doesn't allow Obsidian's origin) or a mixed-content block.
    // Obsidian's requestUrl goes through the native layer and sidesteps both,
    // at the cost of streaming — the text arrives all at once instead.
    yield textEvent(await completeViaRequestUrl(p, url, { ...body, stream: false }, signal));
    return;
  }

  if (!response.ok) {
    throw new Error(await httpErrorMessage(response.status, await response.text().catch(() => "")));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    // Server ignored `stream: true` and sent a plain JSON completion.
    const json = (await response.json()) as ChatChunk;
    const reasoning = json.choices?.[0]?.message?.reasoning_content ?? json.choices?.[0]?.message?.reasoning;
    if (reasoning) yield thinkingEvent(reasoning);
    yield textEvent(extractFullText(json));
    return;
  }
  if (!response.body) throw new Error("Empty response body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null | undefined;
  let gotAny = false;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        // Only `data:` lines carry payloads; `event:` lines (e.g. Hermes' tool progress) are skipped.
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let chunk: ChatChunk;
        try {
          chunk = JSON.parse(payload) as ChatChunk;
        } catch {
          continue;
        }
        if (chunk.error) throw new Error(typeof chunk.error === "string" ? chunk.error : chunk.error.message ?? "Server error");
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const reasoning = choice.delta?.reasoning_content ?? choice.delta?.reasoning;
        if (reasoning) yield thinkingEvent(reasoning);
        const text = choice.delta?.content ?? choice.message?.content;
        if (text) {
          gotAny = true;
          yield textEvent(text);
        }
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (finishReason === "length") {
    throw new Error("The response was cut off — raise “Max output tokens” in settings or select less text.");
  }
  if (finishReason === "content_filter") throw new Error("The server's content filter declined this edit.");
  if (!gotAny) throw new Error("The agent returned no text.");
}

async function completeViaRequestUrl(p: Provider, url: string, body: unknown, signal: AbortSignal): Promise<string> {
  const res = await requestUrl({ url, method: "POST", headers: openAIHeaders(p), body: JSON.stringify(body), throw: false });
  if (signal.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
  if (res.status >= 400) throw new Error(await httpErrorMessage(res.status, res.text));
  return extractFullText(res.json as ChatChunk);
}

function extractFullText(json: ChatChunk): string {
  if (json.error) throw new Error(typeof json.error === "string" ? json.error : json.error.message ?? "Server error");
  const choice = json.choices?.[0];
  const text = choice?.message?.content ?? choice?.delta?.content ?? "";
  if (choice?.finish_reason === "length") {
    throw new Error("The response was cut off — raise “Max output tokens” in settings or select less text.");
  }
  if (!text) throw new Error("The agent returned no text.");
  return text;
}

async function httpErrorMessage(status: number, bodyText: string): Promise<string> {
  let detail = "";
  try {
    const j = JSON.parse(bodyText) as ChatChunk;
    detail = typeof j.error === "string" ? j.error : j.error?.message ?? "";
  } catch {
    detail = bodyText.slice(0, 200);
  }
  const base =
    status === 401 || status === 403
      ? "Authentication failed — check the API key."
      : status === 404
        ? "Endpoint not found — check the base URL (it usually ends in /v1) and model name."
        : status === 429
          ? "Rate limited — try again in a moment."
          : `HTTP ${status}`;
  return detail ? `${base} ${detail}` : base;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses `Name: value` lines into a header map. */
export function parseHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const name = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (name && value) out[name] = value;
  }
  return out;
}

/** Cheap connectivity check used by the settings tab's “Test” button. */
export async function testProvider(p: Provider, ctx: RuntimeContext): Promise<string> {
  if (p.type === "claude-code") {
    requireDesktop(p);
    return testClaudeCli({ command: p.command || "claude", model: p.model, cwd: ctx.vaultPath });
  }
  if (p.type === "codex-cli") {
    requireDesktop(p);
    return testCodexCli({ command: p.command || "codex", model: p.model, cwd: ctx.vaultPath });
  }
  if (p.type === "acp") {
    requireDesktop(p);
    const agent = acpAgentFor(p, ctx);
    await agent.ensureStarted();
    return `connected to ${agent.agentName || "agent"} (process stays warm for 10 min).`;
  }
  if (p.type === "anthropic") {
    const client = anthropicClient(p);
    const m = await client.models.retrieve(p.model);
    return `connected, model “${m.display_name ?? m.id}” available.`;
  }
  const url = openAIUrl(p, "/models");
  const res = await requestUrl({ url, method: "GET", headers: openAIHeaders(p), throw: false });
  if (res.status >= 400) throw new Error(await httpErrorMessage(res.status, res.text));
  const ids = ((res.json as { data?: Array<{ id?: string }> })?.data ?? []).map((m) => m.id).filter(Boolean) as string[];
  if (!ids.length) return "connected (server lists no models).";
  const hasModel = ids.includes(p.model);
  const list = ids.slice(0, 8).join(", ") + (ids.length > 8 ? ", …" : "");
  return hasModel ? `connected, “${p.model}” available. Models: ${list}` : `connected, but “${p.model}” is not listed. Models: ${list}`;
}

/** Removes a code fence wrapper the model sometimes adds despite instructions, and realigns edge whitespace with the original. */
export function normalizeReplacement(result: string, original: string): string {
  let text = result;

  // Strip a single fence wrapping the entire answer (but not if the original was itself fenced).
  if (!original.trimStart().startsWith("```")) {
    const m = text.match(/^\s*```[\w-]*\n([\s\S]*?)\n```\s*$/);
    if (m) text = m[1];
  }

  // Insertion at the cursor: nothing to align with, keep the model's text as-is (minus a stray trailing newline).
  if (original === "") return text;

  // A selection that was only whitespace has nothing to rewrite.
  if (original.trim() === "") return original;

  const lead = original.match(/^\s*/)?.[0] ?? "";
  const trail = original.match(/\s*$/)?.[0] ?? "";
  return lead + text.trim() + trail;
}

export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid API key.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited — try again in a moment.";
  if (err instanceof Anthropic.NotFoundError) return "Model not found — check the model name in settings.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Anthropic API. Check your connection.";
  if (err instanceof Anthropic.APIError) return `API error ${err.status ?? ""}: ${err.message}`;
  if (err instanceof Error && /ENOENT/.test(err.message)) return "Command not found. Check the agent's command/path in settings (GUI apps don't see your shell PATH).";
  if (err instanceof TypeError && /fetch/i.test(err.message)) return "Could not reach the server. Check the base URL, that the server is running, and that it's reachable from this device.";
  if (err instanceof Error) return err.message;
  return String(err);
}
