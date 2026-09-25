import { Editor, FileSystemAdapter, MarkdownView, Menu, Notice, Platform, Plugin, type TFile, type WorkspaceLeaf } from "obsidian";
import { Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { describeError, normalizeReplacement, type RuntimeContext, shutdownLocalAgents, streamEdit } from "./ai";
import { aiTransaction, getJob, jobsField, removeJob, setJob } from "./editor-extension";
import { PromptBox } from "./prompt-box";
import { EditHistory, type EditRecord } from "./history";
import { EditLogView, LOG_VIEW_TYPE } from "./log-view";
import { SetupWizard } from "./wizard";
import { NotekitEditSettingTab, type NotekitEditSettings, DEFAULT_SETTINGS, getProvider, migrateSettings, newProvider, type Provider } from "./settings";
import { SetupLinkModal } from "./import-modal";
import { type ChatContext, ChatSession, locateText } from "./chat";
import { CHAT_VIEW_TYPE, ChatView } from "./chat-view";
import { parseSetupLink, SETUP_LINK_ACTION, type SetupLinkAgent } from "./setup-link";

export default class NotekitEditPlugin extends Plugin {
  settings: NotekitEditSettings = DEFAULT_SETTINGS;
  history = new EditHistory();
  /** The current Ask AI conversation, shown in the chat sidebar. */
  chat = new ChatSession(this);
  private box: PromptBox | null = null;
  private active = new Map<string, AbortController>();
  private statusEl: HTMLElement | null = null;
  private wizard: SetupWizard | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new NotekitEditSettingTab(this.app, this));

    this.registerView(LOG_VIEW_TYPE, (leaf) => new EditLogView(leaf, this));
    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));
    this.addRibbonIcon("sparkles", "AI edits", () => void this.openLogView());
    this.addCommand({ id: "open-log", name: "Open AI edits panel", icon: "list", callback: () => void this.openLogView() });

    this.registerEditorExtension([jobsField, this.viewLifecycle()]);

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        const view = cmView(editor);
        if (!view) return;
        const sel = view.state.selection.main;
        menu.addItem((item) =>
          item
            .setTitle(sel.empty ? "Ask AI to write here" : "Ask AI to edit selection")
            .setIcon("sparkles")
            .setSection("selection")
            .onClick(() => this.openBoxForEditor(editor)),
        );
        menu.addItem((item) =>
          item
            .setTitle(sel.empty ? "Ask AI about this note" : "Ask AI about selection")
            .setIcon("message-square")
            .setSection("selection")
            .onClick(() => void this.openChat(editor)),
        );
      }),
    );

    this.addCommand({
      id: "ask-ai-edit",
      name: "Ask AI to edit selection or write at cursor",
      icon: "sparkles",
      editorCallback: (editor) => this.openBoxForEditor(editor),
    });

    this.addCommand({
      id: "ask-ai-chat",
      name: "Ask AI about selection or note",
      icon: "message-square",
      editorCallback: (editor) => void this.openChat(editor),
    });

    this.addCommand({
      id: "cancel-ai-edits",
      name: "Cancel running AI edits",
      icon: "square",
      checkCallback: (checking) => {
        if (this.active.size === 0) return false;
        if (!checking) this.cancelAll();
        return true;
      },
    });

    this.addCommand({
      id: "setup-wizard",
      name: "Run setup wizard",
      icon: "wand",
      callback: () => this.openWizard(),
    });

    // Setup links (obsidian://notekit-edit?…), usually from the QR code the bridge prints.
    this.registerObsidianProtocolHandler(SETUP_LINK_ACTION, (params) => this.onSetupLink(params));

    if (!Platform.isMobile) {
      this.statusEl = this.addStatusBarItem();
      this.statusEl.addClass("ai-edit-status");
      this.updateStatus();
    }

    if (!this.settings.setupDone) {
      this.app.workspace.onLayoutReady(() => this.openWizard());
    }
  }

  /**
   * Opens the first-run wizard. A finished wizard adds (or updates) the chosen
   * agent and makes it the default; a dismissed one leaves the settings alone
   * but is not shown again automatically.
   */
  openWizard(): void {
    this.wizard = new SetupWizard(this, (picked) => {
      this.wizard = null;
      void this.applyWizardResult(picked);
    });
    this.wizard.open();
  }

  private async applyWizardResult(picked: Provider | null): Promise<void> {
    if (picked) {
      const saved = this.upsertProvider(picked, true, false);
      new Notice(`Notekit Edit will use “${saved.name}”.`);
    }
    this.settings.setupDone = true;
    await this.saveSettings();
  }

  /** The configured agent a new one would replace: same type, and for OpenAI-compatible the same base URL. */
  findMatchingProvider(p: Pick<Provider, "type" | "baseUrl">): Provider | undefined {
    return this.settings.providers.find((x) => x.type === p.type && (p.type !== "openai" || x.baseUrl === p.baseUrl));
  }

  /**
   * Adds `picked`, or updates the equivalent existing agent instead of piling up duplicates.
   * Empty fields of `picked` never overwrite existing values. The wizard only refreshes key, model
   * and command; a setup link (`fromLink`) also sets name, headers and effort. Returns the stored agent.
   */
  private upsertProvider(picked: Provider, makeDefault: boolean, fromLink: boolean): Provider {
    const same = this.findMatchingProvider(picked);
    let saved = picked;
    if (same) {
      Object.assign(same, {
        apiKey: picked.apiKey || same.apiKey,
        model: picked.model || same.model,
        command: picked.command || same.command,
      });
      if (fromLink) {
        Object.assign(same, {
          name: picked.name || same.name,
          headers: picked.headers || same.headers,
          effort: picked.effort || same.effort,
        });
      }
      saved = same;
    } else {
      this.settings.providers.push(picked);
    }
    if (makeDefault || this.settings.providers.length === 1) this.settings.defaultProviderId = saved.id;
    return saved;
  }

  // ---- Setup links ------------------------------------------------------

  private onSetupLink(params: Record<string, string>): void {
    const result = parseSetupLink(params);
    if (!result.ok) {
      new Notice(`Notekit Edit setup link: ${result.error}`, 10000);
      return;
    }
    this.app.workspace.onLayoutReady(() => {
      // A link opened on a fresh install replaces the first-run wizard.
      this.wizard?.close();
      new SetupLinkModal(this, result).open();
    });
  }

  /** Saves an agent from a confirmed setup link. Never creates a local (process-spawning) agent. */
  async importAgent(agent: SetupLinkAgent, makeDefault: boolean): Promise<void> {
    const p = newProvider(agent.type === "anthropic" ? "anthropic" : "openai");
    // Only network fields are copied: command and allowTools keep the preset's empty/false values.
    p.name = agent.name;
    p.baseUrl = agent.baseUrl;
    p.apiKey = agent.apiKey;
    p.model = agent.model;
    p.headers = agent.headers;
    if (agent.effort) p.effort = agent.effort;
    const saved = this.upsertProvider(p, makeDefault, true);
    this.settings.setupDone = true;
    await this.saveSettings();
    new Notice(makeDefault ? `Added “${saved.name}”; it is now the default agent.` : `Added “${saved.name}”.`);
  }

  onunload(): void {
    this.chat.stop();
    this.box?.close();
    this.cancelAll();
    shutdownLocalAgents();
  }

  /** What local backends need from the app: the vault folder (for cwd) and a log sink. */
  runtimeContext(): RuntimeContext {
    const adapter = this.app.vault.adapter;
    const vaultPath = adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
    return { vaultPath };
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as { history?: EditRecord[] } | null;
    this.settings = migrateSettings(raw);
    this.history.load(raw?.history);
  }

  async saveSettings(): Promise<void> {
    await this.saveData({ ...this.settings, history: this.history.records });
  }

  // ---- Edit log ----------------------------------------------------------

  async openLogView(): Promise<void> {
    await this.revealView(LOG_VIEW_TYPE);
  }

  /** Shows the view of `type` in the right sidebar (the right drawer on mobile), creating it if needed. */
  private async revealView(type: string): Promise<WorkspaceLeaf | null> {
    const existing = this.app.workspace.getLeavesOfType(type)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return null;
    if (!existing) await leaf.setViewState({ type, active: true });
    await this.app.workspace.revealLeaf(leaf);
    return leaf;
  }

  // ---- Ask AI chat --------------------------------------------------------

  /** Starts a chat about the editor's selection (or the whole note) and opens the chat sidebar. */
  async openChat(editor: Editor): Promise<void> {
    const file = this.markdownViewFor(editor)?.file ?? this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open a note first.");
      return;
    }
    const selection = editor.getSelection();
    const context: ChatContext = {
      file,
      scope: selection.trim() ? "selection" : "note",
      selection: selection.trim() ? selection : "",
      selectionFrom: editor.posToOffset(editor.getCursor("from")),
    };
    this.chat.start(context);
    const leaf = await this.revealView(CHAT_VIEW_TYPE);
    const view = leaf?.view;
    if (view instanceof ChatView) view.focusInput();
  }

  /** The note's current text: the open editor's content (unsaved changes included), else the file. */
  async currentNoteText(file: TFile): Promise<string> {
    const view = this.markdownViewForFile(file);
    return view ? view.editor.getValue() : this.app.vault.cachedRead(file);
  }

  /** Inserts a chat answer at the cursor of the note, opening the note if needed. */
  async insertIntoNote(file: TFile, text: string): Promise<void> {
    const view = await this.openMarkdownView(file);
    if (!view) return;
    const editor = view.editor;
    const at = editor.getCursor("to");
    editor.replaceRange(text, at);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(at) + text.length));
    new Notice(`Inserted into “${file.basename}”.`);
  }

  /** Replaces the passage the chat is about with a chat answer, if it can still be found. */
  async replaceSelectionInNote(context: ChatContext, text: string): Promise<void> {
    const view = await this.openMarkdownView(context.file);
    if (!view) return;
    const editor = view.editor;
    const range = locateText(editor.getValue(), context.selection, context.selectionFrom);
    if (!range) {
      new Notice("The selected passage has changed or is gone. Insert the answer at the cursor or copy it instead.", 8000);
      return;
    }
    const replacement = normalizeReplacement(text, context.selection);
    editor.replaceRange(replacement, editor.offsetToPos(range.from), editor.offsetToPos(range.to));
    // The chat is now about the new text, so "Replace selection" can be used again on the next answer.
    context.selection = replacement;
    context.selectionFrom = range.from;
    new Notice(`Replaced the selection in “${context.file.basename}”.`);
  }

  private markdownViewFor(editor: Editor): MarkdownView | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.editor === editor) return leaf.view;
    }
    return null;
  }

  private markdownViewForFile(file: TFile): MarkdownView | null {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file === file) return active;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.file === file) return leaf.view;
    }
    return null;
  }

  /** The editor showing `file`, opening the note in the main area when it is not open. */
  private async openMarkdownView(file: TFile): Promise<MarkdownView | null> {
    if (!this.app.vault.getFileByPath(file.path)) {
      new Notice("The note this chat is about no longer exists.");
      return null;
    }
    let view = this.markdownViewForFile(file);
    if (!view) {
      await this.app.workspace.getLeaf(false).openFile(file);
      view = this.markdownViewForFile(file);
    }
    if (!view) new Notice(`Could not open “${file.basename}” in an editor.`);
    return view;
  }

  clearHistory(): void {
    this.history.clear();
    void this.saveSettings();
  }

  cancelEdit(id: string): void {
    this.active.get(id)?.abort();
  }

  // ---- Prompt box -------------------------------------------------------

  /** Opens (and focuses) the box for the editor's selection, or at the cursor if nothing is selected. */
  private openBoxForEditor(editor: Editor): void {
    const view = cmView(editor);
    if (!view) return;
    const { from, to } = view.state.selection.main;
    this.openBox(view, from, to, true);
  }

  private openBox(view: EditorView, from: number, to: number, focus: boolean): void {
    if (this.box && this.box.view === view) {
      this.box.retarget(from, to);
      if (focus) this.box.focus();
      return;
    }
    this.box?.close();
    this.box = new PromptBox(this, { view, from, to, focus });
  }

  onPromptBoxClosed(box: PromptBox): void {
    if (this.box === box) this.box = null;
  }

  /** Closes an open prompt box when its editor goes away (note switched or pane closed). */
  private viewLifecycle() {
    return ViewPlugin.define((view) => ({
      destroy: () => {
        if (this.box?.view === view) this.box.close();
      },
    }));
  }

  // ---- Running an edit ----------------------------------------------------

  async runEdit(view: EditorView, id: string, from: number, to: number, instruction: string, providerId?: string): Promise<void> {
    const provider = getProvider(this.settings, providerId);
    if (!provider) {
      view.dispatch({ effects: removeJob.of(id) });
      new Notice("No agent configured. Add one in the plugin settings.");
      return;
    }
    const original = view.state.sliceDoc(from, to);
    const controller = new AbortController();
    this.active.set(id, controller);
    this.updateStatus();

    const record: EditRecord = {
      id,
      startedAt: Date.now(),
      file: this.fileNameFor(view),
      agent: provider.name || provider.type,
      mode: from === to ? "insert" : "edit",
      instruction,
      original,
      output: "",
      thinking: "",
      status: "running",
    };
    this.history.add(record);

    const dispatchQuiet = (spec: Parameters<EditorView["dispatch"]>[0]) =>
      view.dispatch({
        ...spec,
        annotations: [Transaction.addToHistory.of(false), aiTransaction.of(id)],
      });

    view.dispatch({ effects: setJob.of({ id, from, to, status: "generating", label: record.agent }) });

    let streamed = "";
    let replacedOriginal = false;

    try {
      // The whole note goes along as context (capped for very large notes).
      const doc = view.state.doc;
      const cap = 150_000;
      const req = {
        instruction,
        selection: original,
        before: doc.sliceString(Math.max(0, from - cap), from),
        after: doc.sliceString(to, Math.min(doc.length, to + cap)),
        fileName: record.file,
      };

      for await (const ev of streamEdit(provider, this.settings, this.runtimeContext(), req, controller.signal)) {
        if (ev.type === "thinking") {
          this.history.append(id, "thinking", ev.text);
          continue;
        }
        const delta = ev.text;
        this.history.append(id, "output", delta);
        const job = getJob(view, id);
        if (!job) {
          // The editor state was replaced (note switched / closed): stop quietly.
          controller.abort();
          return;
        }
        if (!replacedOriginal) {
          dispatchQuiet({ changes: { from: job.from, to: job.to, insert: delta } });
          replacedOriginal = true;
        } else {
          dispatchQuiet({ changes: { from: job.to, insert: delta } });
        }
        streamed += delta;
      }

      const job = getJob(view, id);
      if (!job) {
        this.history.update(id, { status: "cancelled", finishedAt: Date.now(), error: "The note was closed or switched before the edit finished." });
        return;
      }
      const finalText = normalizeReplacement(streamed, original);

      // Collapse the many streamed inserts into one undo step: silently put the
      // original back, then apply the final text as a single history entry.
      dispatchQuiet({ changes: { from: job.from, to: job.to, insert: original } });
      const restored = getJob(view, id);
      if (!restored) return;
      view.dispatch({
        changes: { from: restored.from, to: restored.to, insert: finalText },
        effects: setJob.of({ ...restored, status: "done" }),
        annotations: [aiTransaction.of(id)],
        userEvent: "input.ai",
      });
      this.history.update(id, { status: "done", finishedAt: Date.now(), output: finalText });
      this.scheduleRemove(view, id, 1500);
    } catch (err) {
      this.history.update(id, {
        status: controller.signal.aborted ? "cancelled" : "error",
        finishedAt: Date.now(),
        error: controller.signal.aborted ? "Cancelled" : describeError(err),
      });
      const job = getJob(view, id);
      if (job) {
        if (replacedOriginal) dispatchQuiet({ changes: { from: job.from, to: job.to, insert: original } });
        const after = getJob(view, id);
        if (after) view.dispatch({ effects: setJob.of({ ...after, status: "error" }) });
        this.scheduleRemove(view, id, 3000);
      }
      if (!controller.signal.aborted) new Notice(`AI edit failed: ${describeError(err)}`, 8000);
    } finally {
      this.active.delete(id);
      this.updateStatus();
      void this.saveSettings();
    }
  }

  private scheduleRemove(view: EditorView, id: string, ms: number): void {
    view.dom.win.setTimeout(() => {
      try {
        if (getJob(view, id)) view.dispatch({ effects: removeJob.of(id) });
      } catch {
        /* editor gone */
      }
    }, ms);
  }

  private cancelAll(): void {
    for (const c of this.active.values()) c.abort();
    this.active.clear();
    this.updateStatus();
  }

  private updateStatus(): void {
    if (!this.statusEl) return;
    const n = this.active.size;
    this.statusEl.toggleClass("is-active", n > 0);
    const name = getProvider(this.settings)?.name ?? "AI";
    this.statusEl.setText(n === 0 ? "" : n === 1 ? `${name} editing…` : `${name} editing (${n})…`);
  }

  private fileNameFor(view: EditorView): string {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const mv = leaf.view as MarkdownView;
      if (cmView(mv.editor) === view) return mv.file?.basename ?? "Untitled";
    }
    return this.app.workspace.getActiveFile()?.basename ?? "Untitled";
  }
}

/** Obsidian exposes the underlying CodeMirror 6 view as `editor.cm`. */
function cmView(editor: Editor | undefined): EditorView | undefined {
  const cm = (editor as unknown as { cm?: unknown } | undefined)?.cm;
  return cm instanceof EditorView ? cm : undefined;
}
