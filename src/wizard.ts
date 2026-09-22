import { Modal, Platform, setIcon } from "obsidian";
import type NotekitEditPlugin from "./main";
import { testProvider } from "./ai";
import { newProvider, type Preset, type Provider } from "./settings";

type Vendor = "claude" | "codex";
type Access = "subscription" | "api";

/**
 * First-run setup: pick Claude or Codex, then subscription or API key.
 * Subscription = the locally installed CLI and its existing login, so no key
 * is asked for. On mobile there is no local CLI, so "subscription" means
 * pointing at a bridge running on a computer.
 */
export class SetupWizard extends Modal {
  private step = 0;
  private vendor: Vendor = "claude";
  private access: Access = "subscription";
  private apiKey = "";
  private bridgeUrl = "";
  private bridgeKey = "";
  private finished = false;

  constructor(private plugin: NotekitEditPlugin, private onDone: (provider: Provider | null) => void) {
    super(plugin.app);
    this.modalEl.addClass("ai-edit-wizard");
  }

  onOpen(): void {
    this.render();
  }

  onClose(): void {
    if (!this.finished) this.onDone(null);
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.setText("Set up Notekit Edit");
    switch (this.step) {
      case 0:
        return this.renderVendor();
      case 1:
        return this.renderAccess();
      default:
        return this.renderCredentials();
    }
  }

  private choice(parent: HTMLElement, icon: string, title: string, desc: string, selected: boolean, onPick: () => void): void {
    const card = parent.createDiv({ cls: "ai-edit-wizard-card" + (selected ? " is-selected" : "") });
    const ic = card.createDiv({ cls: "ai-edit-wizard-card-icon" });
    setIcon(ic, icon);
    const body = card.createDiv({ cls: "ai-edit-wizard-card-body" });
    body.createDiv({ cls: "ai-edit-wizard-card-title", text: title });
    body.createDiv({ cls: "ai-edit-wizard-card-desc", text: desc });
    card.addEventListener("click", onPick);
  }

  private nav(parent: HTMLElement, opts: { back?: boolean; next: string; onNext: () => void }): void {
    const row = parent.createDiv({ cls: "ai-edit-wizard-nav" });
    if (opts.back) {
      row.createEl("button", { text: "Back" }).addEventListener("click", () => {
        this.step--;
        this.render();
      });
    }
    row.createEl("button", { text: opts.next, cls: "mod-cta" }).addEventListener("click", opts.onNext);
  }

  private renderVendor(): void {
    const { contentEl } = this;
    contentEl.createEl("p", { text: "Which AI do you want to use for editing? You can add more agents later in the settings." });
    const grid = contentEl.createDiv({ cls: "ai-edit-wizard-grid" });
    const pick = (v: Vendor) => () => {
      this.vendor = v;
      this.render();
    };
    this.choice(grid, "sparkles", "Claude", "Anthropic's Claude via Claude Code or the Anthropic API. Recommended.", this.vendor === "claude", pick("claude"));
    this.choice(grid, "bot", "Codex", "OpenAI's models via the Codex CLI or the OpenAI API.", this.vendor === "codex", pick("codex"));
    this.nav(contentEl, {
      next: "Continue",
      onNext: () => {
        this.step = 1;
        this.render();
      },
    });
  }

  private renderAccess(): void {
    const { contentEl } = this;
    const claude = this.vendor === "claude";
    contentEl.createEl("p", { text: `How do you access ${claude ? "Claude" : "Codex"}?` });
    const grid = contentEl.createDiv({ cls: "ai-edit-wizard-grid" });
    const pick = (a: Access) => () => {
      this.access = a;
      this.render();
    };
    const subDesc = Platform.isMobile
      ? `Uses the ${claude ? "Claude Code" : "Codex"} login on one of your computers through the plugin's bridge server (no API key needed).`
      : claude
        ? "Uses Claude Code installed on this computer and its existing login (Claude Pro/Max). No API key needed."
        : "Uses the Codex CLI installed on this computer and its existing login (ChatGPT Plus/Pro). No API key needed.";
    this.choice(grid, "user-check", claude ? "Claude subscription" : "ChatGPT subscription", subDesc, this.access === "subscription", pick("subscription"));
    this.choice(
      grid,
      "key-round",
      "API key",
      claude ? "Pay-as-you-go via the Anthropic API. You'll enter an API key next." : "Pay-as-you-go via the OpenAI API. You'll enter an API key next.",
      this.access === "api",
      pick("api"),
    );
    this.nav(contentEl, {
      back: true,
      next: "Continue",
      onNext: () => {
        this.step = 2;
        this.render();
      },
    });
  }

  private renderCredentials(): void {
    const { contentEl } = this;
    const claude = this.vendor === "claude";
    const status = contentEl.createDiv({ cls: "ai-edit-wizard-status" });

    if (this.access === "api") {
      contentEl.createEl("p", {
        text: claude
          ? "Paste your Anthropic API key (console.anthropic.com → API keys). It's stored only in this vault's plugin data."
          : "Paste your OpenAI API key (platform.openai.com → API keys). It's stored only in this vault's plugin data.",
      });
      const input = contentEl.createEl("input", { type: "password", attr: { placeholder: claude ? "sk-ant-…" : "sk-…", autocomplete: "off" }, cls: "ai-edit-wizard-input" });
      input.value = this.apiKey;
      input.addEventListener("input", () => (this.apiKey = input.value.trim()));
      window.setTimeout(() => input.focus(), 50);
      this.nav(contentEl, {
        back: true,
        next: "Finish",
        onNext: () => {
          if (!this.apiKey) {
            status.setText("Please enter an API key.");
            return;
          }
          this.finish(claude ? "anthropic" : "codex-api", (p) => (p.apiKey = this.apiKey));
        },
      });
      return;
    }

    if (Platform.isMobile) {
      contentEl.createEl("p", {
        text:
          `Obsidian on a phone can't run ${claude ? "Claude Code" : "Codex"} itself. Run the plugin's bridge on a computer where you're logged in ` +
          "(see the README: `node bridge/claude-bridge.cjs --key …`) and enter its address here. You can also skip this and add an agent later.",
      });
      const url = contentEl.createEl("input", { type: "url", attr: { placeholder: "http://192.168.1.20:8765/v1" }, cls: "ai-edit-wizard-input" });
      url.value = this.bridgeUrl;
      url.addEventListener("input", () => (this.bridgeUrl = url.value.trim()));
      const key = contentEl.createEl("input", { type: "password", attr: { placeholder: "Bridge key (--key)", autocomplete: "off" }, cls: "ai-edit-wizard-input" });
      key.value = this.bridgeKey;
      key.addEventListener("input", () => (this.bridgeKey = key.value.trim()));
      this.nav(contentEl, {
        back: true,
        next: "Finish",
        onNext: () => {
          if (!this.bridgeUrl) {
            status.setText("Please enter the bridge address (or go back and choose API key).");
            return;
          }
          this.finish("bridge", (p) => {
            p.baseUrl = this.bridgeUrl.replace(/\/+$/, "");
            p.apiKey = this.bridgeKey;
            p.model = claude ? "claude" : "codex";
            p.name = claude ? "Claude Code bridge" : "Codex bridge";
          });
        },
      });
      return;
    }

    // Desktop subscription: nothing to enter — just verify the CLI is installed and logged in.
    contentEl.createEl("p", {
      text: claude
        ? "Nothing to enter: the plugin runs the Claude Code CLI on this computer and reuses its login. Checking…"
        : "Nothing to enter: the plugin runs the Codex CLI on this computer and reuses its login. Checking…",
    });
    const hint = contentEl.createEl("p", { cls: "ai-edit-wizard-hint" });
    const probe = newProvider(claude ? "claude-code" : "codex-cli");
    testProvider(probe, this.plugin.runtimeContext()).then(
      (msg) => {
        status.setText(`${msg}`);
        if (/NOT logged in/.test(msg)) {
          hint.setText(claude ? "Open a terminal, run `claude`, and use /login. Then press Finish." : "Open a terminal and run `codex login`. Then press Finish.");
        }
      },
      (err: Error) => {
        status.setText(`${err.message}`);
        hint.setText(
          claude
            ? "Install Claude Code (npm install -g @anthropic-ai/claude-code), run `claude` once to log in, then press Finish. You can also set the full path to the CLI in the settings."
            : "Install the Codex CLI (npm install -g @openai/codex), run `codex login`, then press Finish. You can also set the full path to the CLI in the settings.",
        );
      },
    );
    this.nav(contentEl, {
      back: true,
      next: "Finish",
      onNext: () => this.finish(claude ? "claude-code" : "codex-cli", () => undefined),
    });
  }

  private finish(preset: Preset, configure: (p: Provider) => void): void {
    const p = newProvider(preset);
    configure(p);
    this.finished = true;
    this.close();
    this.onDone(p);
  }
}
