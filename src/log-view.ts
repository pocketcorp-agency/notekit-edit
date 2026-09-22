import { ItemView, setIcon, type WorkspaceLeaf } from "obsidian";
import type AIInlineEditPlugin from "./main";
import type { EditRecord } from "./history";

export const LOG_VIEW_TYPE = "obsidianize-edit-log";

/** Sidebar panel: every AI edit with its instruction, original text, output and reasoning. */
export class EditLogView extends ItemView {
  private listEl!: HTMLElement;
  private expanded = new Set<string>();
  private pending: number | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: AIInlineEditPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return LOG_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "AI edits";
  }

  getIcon(): string {
    return "sparkles";
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("ai-edit-log");

    const header = root.createDiv({ cls: "ai-edit-log-header" });
    header.createSpan({ text: "AI edits", cls: "ai-edit-log-title" });
    const clear = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Clear finished edits" } });
    setIcon(clear, "trash-2");
    clear.addEventListener("click", () => this.plugin.clearHistory());

    this.listEl = root.createDiv({ cls: "ai-edit-log-list" });
    this.registerEvent(this.plugin.history.on("change", () => this.scheduleRender()));
    this.render();
  }

  /** Streaming produces many change events; coalesce them into one render per frame. */
  private scheduleRender(): void {
    if (this.pending !== null) return;
    this.pending = window.requestAnimationFrame(() => {
      this.pending = null;
      this.render();
    });
  }

  private render(): void {
    const records = this.plugin.history.records;
    this.listEl.empty();
    if (!records.length) {
      this.listEl.createDiv({ cls: "ai-edit-log-empty", text: "No AI edits yet. Right-click in a note and choose “Ask AI…”." });
      return;
    }
    for (const r of records) this.renderRecord(r);
  }

  private renderRecord(r: EditRecord): void {
    const open = this.expanded.has(r.id);
    const card = this.listEl.createDiv({ cls: `ai-edit-log-card is-${r.status}` + (open ? " is-open" : "") });

    const head = card.createDiv({ cls: "ai-edit-log-card-head" });
    const status = head.createSpan({ cls: "ai-edit-log-status" });
    if (r.status === "running") status.addClass("ai-edit-spinner");
    else setIcon(status, r.status === "done" ? "check" : r.status === "error" ? "alert-circle" : "ban");
    const main = head.createDiv({ cls: "ai-edit-log-card-main" });
    main.createDiv({ cls: "ai-edit-log-instruction", text: r.instruction });
    const meta = main.createDiv({ cls: "ai-edit-log-meta" });
    meta.setText(`${r.agent} · ${r.file} · ${formatTime(r.startedAt)}${durationOf(r)}`);
    head.addEventListener("click", () => {
      if (open) this.expanded.delete(r.id);
      else this.expanded.add(r.id);
      this.render();
    });

    if (!open) return;
    const body = card.createDiv({ cls: "ai-edit-log-body" });

    if (r.status === "running") {
      const cancel = body.createEl("button", { text: "Cancel", cls: "ai-edit-log-cancel" });
      cancel.addEventListener("click", (e) => {
        e.stopPropagation();
        this.plugin.cancelEdit(r.id);
      });
    }
    if (r.error) body.createDiv({ cls: "ai-edit-log-error", text: r.error });

    this.section(body, r.mode === "edit" ? "Original" : "Inserted at cursor", r.mode === "edit" ? r.original : "(nothing selected)", false);
    this.section(body, "Output", r.output || (r.status === "running" ? "…" : "(empty)"), true);
    this.section(body, "Thinking", r.thinking || (r.status === "running" ? "…" : "(none reported by this agent)"), false);
  }

  private section(parent: HTMLElement, title: string, text: string, withCopy: boolean): void {
    const sec = parent.createDiv({ cls: "ai-edit-log-section" });
    const head = sec.createDiv({ cls: "ai-edit-log-section-head" });
    head.createSpan({ text: title });
    if (withCopy) {
      const copy = head.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Copy" } });
      setIcon(copy, "copy");
      copy.addEventListener("click", (e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(text);
      });
    }
    sec.createEl("pre", { cls: "ai-edit-log-pre", text });
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function durationOf(r: EditRecord): string {
  if (!r.finishedAt) return "";
  return ` · ${((r.finishedAt - r.startedAt) / 1000).toFixed(1)}s`;
}
