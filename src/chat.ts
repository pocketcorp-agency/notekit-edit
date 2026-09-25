import { Events, type TFile } from "obsidian";
import { describeError, type ChatMessage, streamChat } from "./ai";
import type NotekitEditPlugin from "./main";
import { getProvider } from "./settings";

/** What a chat is about: a whole note, or a passage of it as it was when the chat started. */
export interface ChatContext {
  file: TFile;
  scope: "note" | "selection";
  /** The selected text (selection scope only). */
  selection: string;
  /** Where the selection started, used to find it again for "Replace selection". */
  selectionFrom: number;
}

export type TurnStatus = "streaming" | "done" | "error" | "cancelled";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking: string;
  status: TurnStatus;
  error?: string;
  /** Agent that wrote an assistant turn. */
  agent?: string;
}

/** Longest note text sent as context; larger notes are cut and the model is told so. */
export const NOTE_CONTEXT_LIMIT = 300_000;

const CHAT_PROMPT = `You are an assistant inside Obsidian, a Markdown note-taking app. The user is chatting with you about one of their notes, or about a passage of it. The note (and the passage, if any) is included in their first message and always reflects the note's latest content.

Rules:
- Answer the user's questions about the note or passage: explain, summarise, critique, suggest, answer questions about its content.
- Reply in Markdown and in the language of the user's question. Be concise unless asked for detail.
- When you propose new or replacement text for the note, put it in its own paragraph or block without commentary inside it, so the user can insert it as is.
- Do not use tools, run commands or touch files: you only talk with the user.`;

export function buildChatSystem(extraInstructions: string): string {
  const extra = extraInstructions.trim();
  return extra ? `${CHAT_PROMPT}\n\nAdditional instructions from the user:\n${extra}` : CHAT_PROMPT;
}

/** The context that goes in front of the first question, built from the note's current text. */
export function buildContextBlock(name: string, noteText: string, scope: ChatContext["scope"], selection: string): string {
  let text = noteText;
  let cut = "";
  if (text.length > NOTE_CONTEXT_LIMIT) {
    text = text.slice(0, NOTE_CONTEXT_LIMIT);
    cut = `\n[The note is longer; only its first ${NOTE_CONTEXT_LIMIT.toLocaleString("en")} characters are included.]`;
  }
  const parts = [`<note name="${name.replace(/"/g, "'")}">\n${text}\n</note>${cut}`];
  if (scope === "selection") {
    parts.push(`The user selected this passage of the note and is asking about it:\n<selection>\n${selection}\n</selection>`);
  } else {
    parts.push("The user is asking about the whole note.");
  }
  return parts.join("\n\n");
}

/**
 * The messages to send for a new question: completed question/answer pairs (failed or cancelled
 * turns are left out, so roles always alternate), then the question. The context block goes in
 * front of the first user message.
 */
export function conversationForRequest(turns: ChatTurn[], question: string, contextBlock: string): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i + 1 < turns.length; i++) {
    const q = turns[i];
    const a = turns[i + 1];
    if (q.role === "user" && a.role === "assistant" && a.status === "done" && a.content.trim()) {
      out.push({ role: "user", content: q.content }, { role: "assistant", content: a.content });
      i++;
    }
  }
  out.push({ role: "user", content: question });
  out[0] = { role: "user", content: `${contextBlock}\n\n---\n\n${out[0].content}` };
  return out;
}

/** Finds `text` in `doc`, choosing the occurrence nearest `hint`. Returns null when it is gone. */
export function locateText(doc: string, text: string, hint: number): { from: number; to: number } | null {
  if (!text) return null;
  let best = -1;
  for (let i = doc.indexOf(text); i >= 0; i = doc.indexOf(text, i + 1)) {
    if (best < 0 || Math.abs(i - hint) < Math.abs(best - hint)) best = i;
  }
  return best < 0 ? null : { from: best, to: best + text.length };
}

let seq = 0;
const newId = () => `t-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * The one current Ask AI conversation. Owned by the plugin; the sidebar view renders it and listens
 * for "change". Nothing here is persisted.
 */
export class ChatSession extends Events {
  context: ChatContext | null = null;
  turns: ChatTurn[] = [];
  private controller: AbortController | null = null;

  constructor(private plugin: NotekitEditPlugin) {
    super();
  }

  get busy(): boolean {
    return this.controller !== null;
  }

  /** Starts a fresh chat about `context`, stopping any answer still streaming. */
  start(context: ChatContext): void {
    this.stop();
    this.context = context;
    this.turns = [];
    this.trigger("change");
  }

  clear(): void {
    this.stop();
    this.turns = [];
    this.trigger("change");
  }

  stop(): void {
    this.controller?.abort();
  }

  async send(question: string, providerId?: string): Promise<void> {
    const text = question.trim();
    const context = this.context;
    if (!text || !context || this.busy) return;
    const provider = getProvider(this.plugin.settings, providerId);
    const user: ChatTurn = { id: newId(), role: "user", content: text, thinking: "", status: "done" };
    const answer: ChatTurn = { id: newId(), role: "assistant", content: "", thinking: "", status: "streaming", agent: provider?.name };
    const previous = this.turns.slice();
    this.turns.push(user, answer);
    const controller = new AbortController();
    this.controller = controller;
    this.trigger("change");

    try {
      if (!provider) throw new Error("No agent configured. Add one in the plugin settings.");
      if (!this.plugin.app.vault.getFileByPath(context.file.path)) throw new Error("The note this chat is about no longer exists.");
      const noteText = await this.plugin.currentNoteText(context.file);
      const messages = conversationForRequest(previous, text, buildContextBlock(context.file.basename, noteText, context.scope, context.selection));
      const system = buildChatSystem(this.plugin.settings.extraInstructions);
      for await (const ev of streamChat(provider, this.plugin.settings, this.plugin.runtimeContext(), system, messages, controller.signal)) {
        if (ev.type === "thinking") answer.thinking += ev.text;
        else answer.content += ev.text;
        this.trigger("change");
      }
      answer.status = answer.content.trim() ? "done" : "error";
      if (answer.status === "error") answer.error = "The agent returned no text.";
    } catch (err) {
      answer.status = controller.signal.aborted ? "cancelled" : "error";
      if (!controller.signal.aborted) answer.error = describeError(err);
    } finally {
      if (this.controller === controller) this.controller = null;
      this.trigger("change");
    }
  }
}
