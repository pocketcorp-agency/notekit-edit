import { Modal, Setting } from "obsidian";
import type NotekitEditPlugin from "./main";
import { isInsecureRemoteUrl, parseSetupLinkUrl, type SetupLinkAgent, type SetupLinkResult } from "./setup-link";

/**
 * Confirms an agent that arrived through a setup link (QR code or pasted link) before it is saved.
 * Opened with a parsed link, it shows the confirmation directly; opened without one, it first asks
 * for the link to be pasted.
 */
export class SetupLinkModal extends Modal {
  private makeDefault = true;

  constructor(
    private plugin: NotekitEditPlugin,
    private link: SetupLinkResult | null,
    private onDone?: () => void,
  ) {
    super(plugin.app);
    this.makeDefault = link?.ok ? link.makeDefault : true;
    this.modalEl.addClass("ai-edit-import");
  }

  onOpen(): void {
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();
    if (this.link?.ok) this.renderConfirm(this.link.agent);
    else this.renderPaste(this.link?.error ?? "");
  }

  private renderPaste(error: string): void {
    const { contentEl } = this;
    this.titleEl.setText("Import setup link");
    contentEl.createEl("p", {
      text: "Paste a setup link. The bridge prints one when it starts, next to its QR code.",
    });
    const input = contentEl.createEl("textarea", { cls: "ai-edit-import-input", attr: { rows: "4", placeholder: "obsidian://notekit-edit?v=1&type=openai&…", "aria-label": "Setup link" } });
    const status = contentEl.createDiv({ cls: "ai-edit-import-error", text: error });
    const row = contentEl.createDiv({ cls: "ai-edit-wizard-nav" });
    row.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    row.createEl("button", { text: "Continue", cls: "mod-cta" }).addEventListener("click", () => {
      const result = parseSetupLinkUrl(input.value);
      if (!result.ok) {
        status.setText(result.error);
        return;
      }
      this.link = result;
      this.makeDefault = result.makeDefault;
      this.render();
    });
    this.contentEl.win.setTimeout(() => input.focus(), 50);
  }

  private renderConfirm(agent: SetupLinkAgent): void {
    const { contentEl } = this;
    this.titleEl.setText("Add agent from setup link");
    contentEl.createEl("p", {
      text: "Only continue if you trust where this link or QR code came from: your notes will be sent to the address below.",
    });

    const existing = this.plugin.findMatchingProvider({ type: agent.type, baseUrl: agent.baseUrl });
    const row = (name: string, value: string) => new Setting(contentEl).setName(name).setDesc(value);
    row("Name", agent.name);
    row("Type", agent.type === "anthropic" ? "Claude (Anthropic API key)" : "OpenAI-compatible");
    row("Base URL", agent.baseUrl || "api.anthropic.com (default)");
    row("Model", agent.model);
    row("Key", agent.apiKey ? "Included (stored in this vault's plugin data)" : "Not included");
    if (agent.headers) row("Extra headers", agent.headers.split("\n").map((l) => l.split(":")[0].trim()).join(", "));
    if (agent.effort) row("Effort", agent.effort);

    if (agent.baseUrl && isInsecureRemoteUrl(agent.baseUrl)) {
      contentEl.createEl("p", {
        cls: "setting-item-description mod-warning",
        text: "This address uses plain http:// outside your local network, so the key and your notes would travel unencrypted. Prefer https:// or a VPN.",
      });
    }
    if (existing) {
      contentEl.createEl("p", { cls: "setting-item-description", text: `This updates the existing agent “${existing.name}” instead of adding a new one.` });
    }

    new Setting(contentEl).setName("Make this the default agent").addToggle((t) =>
      t.setValue(this.makeDefault).onChange((v) => (this.makeDefault = v)),
    );

    const nav = contentEl.createDiv({ cls: "ai-edit-wizard-nav" });
    nav.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    nav.createEl("button", { text: existing ? "Update agent" : "Add agent", cls: "mod-cta" }).addEventListener("click", () => {
      void this.plugin.importAgent(agent, this.makeDefault).then(() => {
        this.close();
        this.onDone?.();
      });
    });
  }
}
