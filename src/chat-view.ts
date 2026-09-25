import { Component, ItemView, MarkdownRenderer, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type { ChatTurn } from "./chat";
import type NotekitEditPlugin from "./main";
import { getProvider } from "./settings";

export const CHAT_VIEW_TYPE = "notekit-edit-chat";

/**
 * Sidebar chat about a note or a selection. Renders the plugin's ChatSession; the input stays in
 * place across renders so typing is never interrupted by streamed answers.
 */
export class ChatView extends ItemView {
  private headerEl!: HTMLElement;
  private listEl!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private agentSelect: HTMLSelectElement | null = null;
  private pending: number | null = null;
  /** Owns the Markdown rendered for finished replies; replaced when a new chat starts. */
  private rendered = new Component();
  /** Finished turns already built, by id, so only the streaming reply is rebuilt on each frame. */
  private cache = new Map<string, HTMLElement>();
  /** The turns array the cache belongs to; ChatSession replaces it on start/clear. */
  private cachedFor: ChatTurn[] | null = null;
  private stickToBottom = true;

  constructor(leaf: WorkspaceLeaf, private plugin: NotekitEditPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Ask AI";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("ai-chat");
    this.headerEl = root.createDiv({ cls: "ai-chat-header" });
    this.listEl = root.createDiv({ cls: "ai-chat-list" });
    this.listEl.addEventListener("scroll", () => {
      const el = this.listEl;
      this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    });

    const inputRow = root.createDiv({ cls: "ai-chat-input" });
    this.input = inputRow.createEl("textarea", { attr: { rows: "2", "aria-label": "Question for the AI" } });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        this.submit();
      }
    });
    this.sendBtn = inputRow.createEl("button", { cls: "ai-chat-send mod-cta" });
    this.sendBtn.addEventListener("click", () => (this.plugin.chat.busy ? this.plugin.chat.stop() : this.submit()));

    this.registerEvent(this.plugin.chat.on("change", () => this.scheduleRender()));
    this.render();
  }

  async onClose(): Promise<void> {
    if (this.pending !== null) this.contentEl.win.cancelAnimationFrame(this.pending);
    this.pending = null;
    // Unload rendered Markdown and forget cached turns; reopening rebuilds them from the session.
    this.removeChild(this.rendered);
    this.cache.clear();
    this.cachedFor = null;
  }

  focusInput(): void {
    this.input?.focus();
  }

  private submit(): void {
    const text = this.input.value.trim();
    if (!text || this.plugin.chat.busy) return;
    if (!this.plugin.chat.context) {
      new Notice("Right-click in a note first and choose to ask AI about it.");
      return;
    }
    this.input.value = "";
    this.stickToBottom = true;
    void this.plugin.chat.send(text, this.agentSelect?.value);
  }

  private scheduleRender(): void {
    if (this.pending !== null) return;
    this.pending = this.contentEl.win.requestAnimationFrame(() => {
      this.pending = null;
      this.render();
    });
  }

  private render(): void {
    const chat = this.plugin.chat;
    const ctx = chat.context;
    this.renderHeader();

    if (chat.turns !== this.cachedFor) {
      // New or cleared chat: drop cached turns and unload their rendered Markdown.
      this.removeChild(this.rendered);
      this.rendered = this.addChild(new Component());
      this.cache.clear();
      this.cachedFor = chat.turns;
    }
    this.listEl.empty();

    if (!ctx) {
      this.listEl.createDiv({ cls: "ai-chat-empty", text: "Right-click in a note and choose “Ask AI about this note”, or select text first and choose “Ask AI about selection”." });
    } else if (!chat.turns.length) {
      this.listEl.createDiv({ cls: "ai-chat-empty", text: ctx.scope === "selection" ? "Ask anything about the selected passage." : "Ask anything about this note." });
    }
    for (const turn of chat.turns) this.renderTurn(turn);

    this.input.disabled = !ctx;
    this.input.placeholder = !ctx ? "" : ctx.scope === "selection" ? "Ask about the selection…" : "Ask about this note…";
    this.sendBtn.empty();
    setIcon(this.sendBtn, chat.busy ? "square" : "send");
    this.sendBtn.setAttr("aria-label", chat.busy ? "Stop" : "Send");
    this.sendBtn.disabled = !ctx;
    if (this.stickToBottom) this.listEl.scrollTop = this.listEl.scrollHeight;
  }

  private renderHeader(): void {
    const chat = this.plugin.chat;
    const ctx = chat.context;
    const settings = this.plugin.settings;
    const keep = this.agentSelect?.value;
    this.headerEl.empty();

    const about = this.headerEl.createDiv({ cls: "ai-chat-about" });
    if (ctx) {
      about.createSpan({ cls: "ai-chat-about-label", text: ctx.scope === "selection" ? "Selection in " : "Note " });
      about.createSpan({ cls: "ai-chat-about-file", text: ctx.file.basename });
      if (ctx.scope === "selection") {
        const short = ctx.selection.replace(/\s+/g, " ").trim();
        about.createDiv({ cls: "ai-chat-about-excerpt", text: `“${short.length > 90 ? short.slice(0, 87) + "…" : short}”` });
      }
    } else {
      about.setText("No note selected");
    }

    const tools = this.headerEl.createDiv({ cls: "ai-chat-tools" });
    this.agentSelect = null;
    if (settings.providers.length > 1) {
      const select = tools.createEl("select", { cls: "dropdown ai-chat-agent", attr: { "aria-label": "Agent" } });
      for (const p of settings.providers) select.createEl("option", { value: p.id, text: p.name || "Unnamed" });
      select.value = keep ?? getProvider(settings)?.id ?? settings.providers[0].id;
      select.addEventListener("change", () => {
        settings.defaultProviderId = select.value;
        void this.plugin.saveSettings();
      });
      this.agentSelect = select;
    }
    const clear = tools.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "New chat" } });
    setIcon(clear, "rotate-ccw");
    clear.disabled = !ctx || !chat.turns.length;
    clear.addEventListener("click", () => chat.clear());
  }

  private renderTurn(turn: ChatTurn): void {
    const cached = this.cache.get(turn.id);
    if (cached) {
      this.listEl.appendChild(cached);
      return;
    }
    const el = this.listEl.createDiv({ cls: `ai-chat-turn is-${turn.role} is-${turn.status}` });
    this.buildTurn(el, turn);
    if (turn.status !== "streaming") this.cache.set(turn.id, el);
  }

  private buildTurn(el: HTMLElement, turn: ChatTurn): void {
    const ctx = this.plugin.chat.context;
    if (turn.role === "user") {
      el.createDiv({ cls: "ai-chat-bubble", text: turn.content });
      return;
    }

    if (turn.thinking) {
      const details = el.createEl("details", { cls: "ai-chat-thinking" });
      details.createEl("summary", { text: "Thinking" });
      details.createDiv({ cls: "ai-chat-thinking-text", text: turn.thinking });
    }
    const body = el.createDiv({ cls: "ai-chat-answer" });
    if (turn.status === "streaming") {
      if (turn.content) body.createDiv({ cls: "ai-chat-streaming", text: turn.content });
      else body.createSpan({ cls: "ai-edit-spinner" });
    } else if (turn.content) {
      void MarkdownRenderer.render(this.app, turn.content, body, ctx?.file.path ?? "", this.rendered);
    }
    if (turn.status === "error") el.createDiv({ cls: "ai-chat-error", text: turn.error ?? "Something went wrong." });
    if (turn.status === "cancelled") el.createDiv({ cls: "ai-chat-note", text: "Stopped." });

    if (turn.status !== "done" || !turn.content || !ctx) return;
    const actions = el.createDiv({ cls: "ai-chat-actions" });
    const action = (icon: string, label: string, run: () => void) => {
      const b = actions.createEl("button", { cls: "ai-chat-action", attr: { "aria-label": label } });
      setIcon(b.createSpan(), icon);
      b.createSpan({ text: label });
      b.addEventListener("click", run);
    };
    action("copy", "Copy", () => {
      void navigator.clipboard.writeText(turn.content).then(() => new Notice("Copied."));
    });
    action("text-cursor-input", "Insert at cursor", () => void this.plugin.insertIntoNote(ctx.file, turn.content));
    if (ctx.scope === "selection") {
      action("replace", "Replace selection", () => void this.plugin.replaceSelectionInNote(ctx, turn.content));
    }
    if (turn.agent) actions.createSpan({ cls: "ai-chat-agent-name", text: turn.agent });
  }
}
