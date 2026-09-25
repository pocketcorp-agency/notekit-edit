import { Component, ItemView, MarkdownRenderer, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type { ChatTurn, TurnStatus } from "./chat";
import { closeOpenBlocks, LiveRender } from "./live-markdown";
import type NotekitEditPlugin from "./main";
import { getProvider } from "./settings";

export const CHAT_VIEW_TYPE = "notekit-edit-chat";

/** The DOM for one turn. Kept across renders so streaming updates happen in place. */
interface TurnView {
  turn: ChatTurn;
  el: HTMLElement;
  /** Assistant turns: where the Markdown goes. */
  body: HTMLElement | null;
  thinking: HTMLDetailsElement | null;
  thinkingText: HTMLElement | null;
  live: LiveRender | null;
  /** Parent of the components of this turn's Markdown renders. */
  component: Component;
  /** Component of the Markdown currently shown; unloaded when the next render replaces it. */
  current: Component | null;
  finalized: boolean;
  disposed: boolean;
}

/**
 * Sidebar chat about a note or a selection. Renders the plugin's ChatSession. Turn elements are
 * created once and updated in place: the streaming answer is re-rendered as Markdown (code blocks
 * included) while it arrives, and the input stays untouched so typing is never interrupted.
 */
export class ChatView extends ItemView {
  private headerEl!: HTMLElement;
  private listEl!: HTMLElement;
  private emptyEl: HTMLElement | null = null;
  private input!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private agentSelect: HTMLSelectElement | null = null;
  private pending: number | null = null;
  private views = new Map<string, TurnView>();
  /** The turns array the views belong to; ChatSession replaces it on start/clear. */
  private viewsFor: ChatTurn[] | null = null;
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
    // Reopening rebuilds every turn from the session.
    this.disposeViews();
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

    if (chat.turns !== this.viewsFor) {
      // New or cleared chat: drop the old turns and unload their rendered Markdown.
      this.disposeViews();
      this.viewsFor = chat.turns;
    }

    const emptyText = !ctx
      ? "Right-click in a note and choose “Ask AI about this note”, or select text first and choose “Ask AI about selection”."
      : !chat.turns.length
        ? ctx.scope === "selection"
          ? "Ask anything about the selected passage."
          : "Ask anything about this note."
        : "";
    if (emptyText) {
      this.emptyEl ??= this.listEl.createDiv({ cls: "ai-chat-empty" });
      this.emptyEl.setText(emptyText);
    } else {
      this.emptyEl?.remove();
      this.emptyEl = null;
    }

    // Keep existing turn elements where they are; only add, reorder or remove what changed.
    let prev: Element | null = this.emptyEl;
    for (const turn of chat.turns) {
      const view = this.viewFor(turn);
      const expectedPrev = prev;
      if (view.el.parentElement !== this.listEl || view.el.previousElementSibling !== expectedPrev) {
        this.listEl.insertBefore(view.el, expectedPrev ? expectedPrev.nextSibling : this.listEl.firstChild);
      }
      this.updateTurn(view);
      prev = view.el;
    }

    this.input.disabled = !ctx;
    this.input.placeholder = !ctx ? "" : ctx.scope === "selection" ? "Ask about the selection…" : "Ask about this note…";
    this.sendBtn.empty();
    setIcon(this.sendBtn, chat.busy ? "square" : "send");
    this.sendBtn.setAttr("aria-label", chat.busy ? "Stop" : "Send");
    this.sendBtn.disabled = !ctx;
    this.scrollIfFollowing();
  }

  private scrollIfFollowing(): void {
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

  // ---- Turns ----------------------------------------------------------------

  private viewFor(turn: ChatTurn): TurnView {
    const existing = this.views.get(turn.id);
    if (existing) return existing;
    const el = createDiv({ cls: `ai-chat-turn is-${turn.role}` });
    const view: TurnView = {
      turn,
      el,
      body: null,
      thinking: null,
      thinkingText: null,
      live: null,
      component: this.addChild(new Component()),
      current: null,
      finalized: false,
      disposed: false,
    };
    if (turn.role === "user") {
      el.createDiv({ cls: "ai-chat-bubble", text: turn.content });
      view.finalized = true;
    } else {
      view.body = el.createDiv({ cls: "ai-chat-answer" });
      if (turn.status === "streaming") {
        view.body.addClass("is-streaming");
        view.body.createSpan({ cls: "ai-edit-spinner" });
      }
      const win = this.contentEl.win;
      view.live = new LiveRender((md) => this.renderMarkdown(view, md), {
        set: (fn, ms) => win.setTimeout(fn, ms),
        clear: (id) => win.clearTimeout(id),
        now: () => Date.now(),
      });
    }
    this.views.set(turn.id, view);
    return view;
  }

  private updateTurn(view: TurnView): void {
    const turn = view.turn;
    this.setStatusClass(view.el, turn.status);
    if (turn.role === "user" || view.finalized) return;

    if (turn.thinking) {
      if (!view.thinking) {
        // Built once and updated in place, so it keeps its open/closed state while streaming.
        view.thinking = createEl("details", { cls: "ai-chat-thinking" });
        view.thinking.createEl("summary", { text: "Thinking" });
        view.thinkingText = view.thinking.createDiv({ cls: "ai-chat-thinking-text" });
        view.el.insertBefore(view.thinking, view.body);
      }
      if (view.thinkingText && view.thinkingText.textContent !== turn.thinking) view.thinkingText.setText(turn.thinking);
    }

    if (turn.status === "streaming") {
      if (turn.content) view.live?.update(closeOpenBlocks(turn.content));
      return;
    }
    view.finalized = true;
    void this.finalizeTurn(view);
  }

  private setStatusClass(el: HTMLElement, status: TurnStatus): void {
    for (const s of ["streaming", "done", "error", "cancelled"] as const) el.toggleClass(`is-${s}`, s === status);
  }

  /** Renders `md` off-screen, then swaps it in, so the answer never flashes empty between renders. */
  private async renderMarkdown(view: TurnView, md: string): Promise<void> {
    if (view.disposed || !view.body) return;
    const staging = createDiv();
    const component = view.component.addChild(new Component());
    await MarkdownRenderer.render(this.app, md, staging, this.plugin.chat.context?.file.path ?? "", component);
    if (view.disposed) {
      view.component.removeChild(component);
      return;
    }
    view.body.replaceChildren(...Array.from(staging.childNodes));
    if (view.current) view.component.removeChild(view.current);
    view.current = component;
    this.scrollIfFollowing();
  }

  /** Final render of a finished answer, then its notes and actions. */
  private async finalizeTurn(view: TurnView): Promise<void> {
    const turn = view.turn;
    const body = view.body;
    if (!body) return;
    body.removeClass("is-streaming");
    if (turn.content) await view.live?.finish(turn.content);
    else body.empty();
    view.live?.dispose();
    if (view.disposed) return;

    const ctx = this.plugin.chat.context;
    if (turn.status === "error") view.el.createDiv({ cls: "ai-chat-error", text: turn.error ?? "Something went wrong." });
    if (turn.status === "cancelled") view.el.createDiv({ cls: "ai-chat-note", text: "Stopped." });

    if (turn.status === "done" && turn.content && ctx) {
      const actions = view.el.createDiv({ cls: "ai-chat-actions" });
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
    this.scrollIfFollowing();
  }

  private disposeViews(): void {
    for (const view of this.views.values()) {
      view.disposed = true;
      view.live?.dispose();
      this.removeChild(view.component);
      view.el.remove();
    }
    this.views.clear();
    this.viewsFor = null;
  }
}
