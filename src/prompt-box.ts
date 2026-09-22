import { Modal, Platform, setIcon } from "obsidian";
import type { EditorView } from "@codemirror/view";
import type NotekitEditPlugin from "./main";
import { getJob, removeJob, setJob } from "./editor-extension";
import { getProvider } from "./settings";

export interface PromptBoxOptions {
  view: EditorView;
  from: number;
  to: number;
  /** Focus the textarea immediately (context menu / command) or leave the editor focused (auto-show on selection). */
  focus: boolean;
}

/**
 * The small floating prompt that appears next to a selection. On desktop it is
 * anchored below the selection; on mobile it docks to the bottom of the screen
 * above the keyboard. While open it tags the target range so the user can see
 * what the instruction applies to even after the editor loses focus.
 */
export class PromptBox {
  readonly id = `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  readonly view: EditorView;
  private el: HTMLElement;
  /** On mobile the box lives inside an Obsidian modal, which handles the keyboard and backdrop for us. */
  private modal: Modal | null = null;
  private textarea: HTMLTextAreaElement;
  private excerptEl: HTMLElement;
  private agentSelect: HTMLSelectElement | null = null;
  private closed = false;
  private readonly onDocMouseDown = (e: MouseEvent) => {
    if (!this.el.contains(e.target as Node)) this.close();
  };
  private readonly onScroll = () => this.position();
  private readonly onResize = () => this.position();
  /** The editor's own document/window, so the box works inside popout windows too. */
  private readonly doc: Document;
  private readonly win: Window;

  constructor(private plugin: NotekitEditPlugin, opts: PromptBoxOptions) {
    this.view = opts.view;
    this.doc = opts.view.dom.doc;
    this.win = opts.view.dom.win;
    this.view.dispatch({ effects: setJob.of({ id: this.id, from: opts.from, to: opts.to, status: "target" }) });

    if (Platform.isMobile) {
      this.modal = new Modal(plugin.app);
      this.modal.titleEl.setText("Ask AI");
      this.modal.modalEl.addClass("ai-edit-modal");
      this.modal.onClose = () => this.close();
      this.modal.open();
      this.el = this.modal.contentEl.createDiv({ cls: "ai-edit-box is-mobile" });
    } else {
      this.el = this.doc.body.createDiv({ cls: "ai-edit-box" });
    }

    const header = this.el.createDiv({ cls: "ai-edit-box-header" });
    const icon = header.createSpan({ cls: "ai-edit-box-icon" });
    setIcon(icon, "sparkles");
    this.excerptEl = header.createSpan({ cls: "ai-edit-box-excerpt" });
    const providers = plugin.settings.providers;
    if (providers.length > 1) {
      // Agent picker: the choice sticks as the default for subsequent edits.
      this.agentSelect = header.createEl("select", { cls: "dropdown ai-edit-box-agent", attr: { "aria-label": "Agent" } });
      for (const p of providers) {
        this.agentSelect.createEl("option", { value: p.id, text: p.name || "Unnamed" });
      }
      this.agentSelect.value = getProvider(plugin.settings)?.id ?? providers[0].id;
      this.agentSelect.addEventListener("change", () => {
        plugin.settings.defaultProviderId = this.agentSelect!.value;
        void plugin.saveSettings();
      });
    } else {
      const only = providers[0];
      if (only) header.createSpan({ cls: "ai-edit-box-agent-name", text: only.name });
    }
    const closeBtn = header.createEl("button", { cls: "ai-edit-box-close clickable-icon", attr: { "aria-label": "Close" } });
    setIcon(closeBtn, "x");
    closeBtn.addEventListener("click", () => this.close(true));

    const inputRow = this.el.createDiv({ cls: "ai-edit-box-input" });
    this.textarea = inputRow.createEl("textarea", {
      attr: { rows: "1", placeholder: opts.from === opts.to ? "What should be written here?" : "What should change?", "aria-label": "Instruction for the AI" },
    });
    const sendBtn = inputRow.createEl("button", { cls: "ai-edit-box-send mod-cta", attr: { "aria-label": "Send" } });
    setIcon(sendBtn, "send");
    sendBtn.addEventListener("click", () => this.submit());

    this.textarea.addEventListener("input", () => this.autosize());
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        this.submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close(true);
      }
    });

    this.updateExcerpt();
    this.position();

    if (!this.modal) {
      // Deferred so the click/selection that opened the box doesn't immediately close it.
      this.win.setTimeout(() => {
        if (this.closed) return;
        this.doc.addEventListener("mousedown", this.onDocMouseDown, true);
        this.doc.addEventListener("touchstart", this.onDocMouseDown as EventListener, true);
      }, 0);
      this.view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
      this.win.addEventListener("resize", this.onResize);
    }

    if (opts.focus) this.focus();
  }

  get isFocused(): boolean {
    return this.doc.activeElement === this.textarea;
  }

  get hasText(): boolean {
    return this.textarea.value.trim().length > 0;
  }

  focus(): void {
    this.textarea.focus();
    this.textarea.setSelectionRange(this.textarea.value.length, this.textarea.value.length);
  }

  /** Re-point the box at a new range (used when the user changes the selection while it's open). */
  retarget(from: number, to: number): void {
    if (this.closed) return;
    this.view.dispatch({ effects: setJob.of({ id: this.id, from, to, status: "target" }) });
    this.updateExcerpt();
    this.position();
  }

  private currentRange(): { from: number; to: number } | undefined {
    const job = getJob(this.view, this.id);
    return job ? { from: job.from, to: job.to } : undefined;
  }

  private updateExcerpt(): void {
    const r = this.currentRange();
    if (!r) return;
    const text = this.view.state.sliceDoc(r.from, r.to).replace(/\s+/g, " ").trim();
    const short = text.length > 60 ? text.slice(0, 57) + "…" : text;
    this.excerptEl.setText(r.from === r.to ? "Write at cursor" : short ? `“${short}”` : "Selected text");
  }

  private autosize(): void {
    this.textarea.setCssProps({ height: "auto" });
    this.textarea.setCssProps({ height: `${Math.min(this.textarea.scrollHeight, 160)}px` });
  }

  private position(): void {
    if (this.closed || Platform.isMobile) return;
    const r = this.currentRange();
    if (!r) return;
    const pad = 8;
    const vw = this.win.innerWidth;
    const vh = this.win.innerHeight;
    const rect = this.el.getBoundingClientRect();
    const endCoords = this.view.coordsAtPos(r.to) ?? this.view.coordsAtPos(r.from);
    const startCoords = this.view.coordsAtPos(r.from) ?? endCoords;
    if (!endCoords || !startCoords) {
      // Target scrolled out of view: park the box at the bottom of the editor.
      const ed = this.view.dom.getBoundingClientRect();
      this.el.setCssProps({
        left: `${Math.max(pad, ed.left + pad)}px`,
        top: `${Math.min(vh - rect.height - pad, ed.bottom - rect.height - pad)}px`,
      });
      return;
    }
    let left = Math.min(startCoords.left, vw - rect.width - pad);
    left = Math.max(pad, left);
    let top = endCoords.bottom + 6;
    if (top + rect.height > vh - pad) {
      top = startCoords.top - rect.height - 6;
      if (top < pad) top = Math.max(pad, vh - rect.height - pad);
    }
    this.el.setCssProps({ left: `${left}px`, top: `${top}px` });
  }

  private submit(instruction = this.textarea.value): void {
    const text = instruction.trim();
    if (!text || this.closed) return;
    const r = this.currentRange();
    if (!r) {
      this.close(true);
      return;
    }
    // Hand the tracked range over to the job runner; it reuses this id so the
    // "target" highlight transitions straight into "generating".
    const providerId = this.agentSelect?.value ?? this.plugin.settings.defaultProviderId;
    this.close(false, /* keepJob */ true);
    void this.plugin.runEdit(this.view, this.id, r.from, r.to, text, providerId);
  }

  close(refocusEditor = false, keepJob = false): void {
    if (this.closed) return;
    this.closed = true;
    this.doc.removeEventListener("mousedown", this.onDocMouseDown, true);
    this.doc.removeEventListener("touchstart", this.onDocMouseDown as EventListener, true);
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    this.win.removeEventListener("resize", this.onResize);
    this.el.remove();
    this.modal?.close();
    if (!keepJob) {
      try {
        this.view.dispatch({ effects: removeJob.of(this.id) });
      } catch {
        /* editor already destroyed */
      }
    }
    this.plugin.onPromptBoxClosed(this);
    if (refocusEditor && !this.modal) this.view.focus();
  }
}
