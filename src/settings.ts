import { App, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import type NotekitEditPlugin from "./main";
import { testProvider } from "./ai";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type ProviderType = "anthropic" | "openai" | "claude-code" | "codex-cli" | "acp";

/** One configured agent/backend the user can send edits to. */
export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  /** Anthropic: optional API base override. OpenAI-compatible: required, e.g. http://192.168.1.20:8642/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Thinking effort (Anthropic models only). */
  effort: Effort;
  /** Extra HTTP headers, one `Name: value` per line (e.g. X-Hermes-Session-Key). */
  headers: string;
  /** claude-code: CLI path/name. acp: full command line that starts the agent. */
  command: string;
  /** acp: auto-approve the agent's tool permission requests. */
  allowTools: boolean;
}

export const LOCAL_TYPES: ProviderType[] = ["claude-code", "codex-cli", "acp"];
export const isLocalProvider = (p: Provider): boolean => LOCAL_TYPES.includes(p.type);

export interface NotekitEditSettings {
  /** True once the first-run wizard has finished (or been skipped). */
  setupDone: boolean;
  providers: Provider[];
  /** The agent used for new requests; the prompt box's picker updates it. */
  defaultProviderId: string;
  maxTokens: number;
  /** Extra instructions appended to the built-in system prompt. */
  extraInstructions: string;
}

export const DEFAULT_SETTINGS: NotekitEditSettings = {
  setupDone: false,
  providers: [],
  defaultProviderId: "",
  maxTokens: 16000,
  extraInstructions: "",
};

export type Preset = "claude-code" | "anthropic" | "codex-cli" | "codex-api" | "bridge" | "acp" | "hermes" | "openai";

const BASE: Omit<Provider, "id" | "name" | "type"> = { baseUrl: "", apiKey: "", model: "", effort: "medium", headers: "", command: "", allowTools: false };

const PRESETS: Record<Preset, Omit<Provider, "id">> = {
  "claude-code": { ...BASE, name: "Claude Code (subscription)", type: "claude-code", command: "claude", model: "" },
  anthropic: { ...BASE, name: "Claude (API key)", type: "anthropic", model: "claude-opus-5" },
  "codex-cli": { ...BASE, name: "Codex (subscription)", type: "codex-cli", command: "codex", model: "" },
  "codex-api": { ...BASE, name: "OpenAI (API key)", type: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-6-astra" },
  bridge: { ...BASE, name: "Claude Code bridge", type: "openai", baseUrl: "http://192.168.1.20:8765/v1", model: "claude" },
  acp: { ...BASE, name: "Claude via ACP", type: "acp", command: "npx -y @agentclientprotocol/claude-agent-acp" },
  hermes: { ...BASE, name: "Hermes Agent", type: "openai", baseUrl: "http://127.0.0.1:8642/v1", model: "hermes-agent" },
  openai: { ...BASE, name: "OpenAI-compatible", type: "openai", baseUrl: "http://localhost:11434/v1" },
};

export function newProvider(preset: Preset): Provider {
  return { id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ...PRESETS[preset] };
}

/**
 * Normalises whatever is on disk into the current settings shape. Older
 * versions stored a single Anthropic key/model at the top level; those become
 * the first provider.
 */
export function migrateSettings(raw: unknown): NotekitEditSettings {
  const data = (raw ?? {}) as Partial<NotekitEditSettings> & { apiKey?: string; model?: string; effort?: Effort };
  const settings: NotekitEditSettings = { ...DEFAULT_SETTINGS, ...data, providers: [] };

  settings.setupDone = Boolean(data.setupDone);
  if (Array.isArray(data.providers) && data.providers.length) {
    settings.providers = data.providers.map((p: Partial<Provider>) => ({
      ...BASE,
      ...p,
      id: p.id ?? newProvider("anthropic").id,
      name: p.name ?? "",
      type: p.type ?? "anthropic",
    }));
  } else if (data.apiKey) {
    // Pre-0.2 settings: a single Anthropic key at the top level.
    const legacy = newProvider("anthropic");
    legacy.apiKey = data.apiKey;
    if (data.model) legacy.model = data.model;
    if (data.effort) legacy.effort = data.effort;
    settings.providers = [legacy];
    settings.setupDone = true;
  } else {
    // Fresh install: local Claude Code is the default; the wizard can change it.
    settings.providers = [newProvider("claude-code")];
  }
  if (!settings.providers.some((p) => p.id === settings.defaultProviderId)) {
    settings.defaultProviderId = settings.providers[0].id;
  }
  return settings;
}

export function getProvider(settings: NotekitEditSettings, id?: string): Provider | undefined {
  return settings.providers.find((p) => p.id === (id ?? settings.defaultProviderId)) ?? settings.providers[0];
}

export class NotekitEditSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: NotekitEditPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();

    new Setting(containerEl)
      .setName("Setup wizard")
      .setDesc("Pick Claude or Codex and whether to use a subscription or an API key. This is how agents are added; re-run it any time.")
      .addButton((b) => b.setButtonText("Relaunch wizard").setCta().onClick(() => this.plugin.openWizard()));

    new Setting(containerEl).setName("Agents").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Agents set up by the wizard. “Claude Code” and “Codex” run the CLI on this computer with its own login (desktop only); " +
        "“Claude (API key)” calls the Anthropic API directly; “OpenAI-compatible” is used for the bridge, OpenAI, and other servers. " +
        "Change an agent's type here if you need something else, such as an ACP agent or a Hermes/Ollama server.",
    });

    for (const p of s.providers) this.renderProvider(containerEl, p);

    new Setting(containerEl).setName("Behaviour").setHeading();

    new Setting(containerEl)
      .setName("Extra instructions")
      .setDesc("Appended to the system prompt on every request, for example your writing style or language preferences.")
      .addTextArea((t) => {
        t.inputEl.rows = 4;
        t.setPlaceholder("Write in British English. Never use em dashes.")
          .setValue(s.extraInstructions)
          .onChange(async (v) => {
            s.extraInstructions = v;
            await save();
          });
      });

    new Setting(containerEl)
      .setName("Max output tokens")
      .addText((t) =>
        t.setValue(String(s.maxTokens)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n > 0) {
            s.maxTokens = n;
            await save();
          }
        }),
      );
  }

  /** Re-renders the tab after a structural change (agent added/removed, type changed, default moved). */
  private refresh(): void {
    this.display();
  }

  private renderProvider(containerEl: HTMLElement, p: Provider): void {
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();
    const isDefault = s.defaultProviderId === p.id;

    const wrap = containerEl.createDiv({ cls: "ai-edit-provider" });
    if (isDefault) wrap.addClass("is-default");

    const head = new Setting(wrap).setName(p.name || "Unnamed agent").setDesc(isDefault ? "Default agent" : "");
    head.settingEl.addClass("ai-edit-provider-head");
    if (!isDefault) {
      head.addButton((b) =>
        b.setButtonText("Set default").onClick(async () => {
          s.defaultProviderId = p.id;
          await save();
          this.refresh();
        }),
      );
    }
    head.addButton((b) =>
      b.setButtonText("Test").onClick(() => {
        b.setDisabled(true).setButtonText("Testing…");
        testProvider(p, this.plugin.runtimeContext())
          .then((msg) => new Notice(`${p.name}: ${msg}`, 6000))
          .catch((e: unknown) => new Notice(`${p.name}: ${e instanceof Error ? e.message : String(e)}`, 8000))
          .finally(() => b.setDisabled(false).setButtonText("Test"));
      }),
    );
    head.addButton((b) =>
      b
        .setIcon("trash")
        .setTooltip("Remove agent")
        .setWarning()
        .onClick(async () => {
          s.providers = s.providers.filter((x) => x.id !== p.id);
          if (s.defaultProviderId === p.id) s.defaultProviderId = s.providers[0]?.id ?? "";
          await save();
          this.refresh();
        }),
    );

    new Setting(wrap).setName("Name").addText((t) =>
      t.setValue(p.name).onChange(async (v) => {
        p.name = v;
        head.setName(v || "Unnamed agent");
        await save();
      }),
    );

    new Setting(wrap)
      .setName("Type")
      .addDropdown((d) =>
        d
          .addOptions({
            "claude-code": "Claude Code CLI (subscription, local)",
            "codex-cli": "Codex CLI (subscription, local)",
            acp: "ACP agent (local process)",
            anthropic: "Claude (Anthropic API key)",
            openai: "OpenAI-compatible (Hermes, Ollama, bridge, …)",
          })
          .setValue(p.type)
          .onChange(async (v) => {
            p.type = v as ProviderType;
            if (p.type === "openai" && !p.baseUrl) p.baseUrl = PRESETS.openai.baseUrl;
            if (p.type === "anthropic" && !p.model) p.model = PRESETS.anthropic.model;
            if (p.type === "claude-code" && !p.command) p.command = PRESETS["claude-code"].command;
            if (p.type === "codex-cli" && !p.command) p.command = PRESETS["codex-cli"].command;
            if (p.type === "acp" && !p.command) p.command = PRESETS.acp.command;
            await save();
            this.refresh();
          }),
      );

    if (isLocalProvider(p) && Platform.isMobile) {
      wrap.createEl("p", {
        cls: "setting-item-description mod-warning",
        text: "This agent runs a local process and only works in Obsidian on desktop. On this device, use a Claude Code bridge or another OpenAI-compatible agent instead.",
      });
    }

    switch (p.type) {
      case "claude-code":
        this.renderClaudeCodeFields(wrap, p);
        break;
      case "codex-cli":
        this.renderCodexFields(wrap, p);
        break;
      case "acp":
        this.renderAcpFields(wrap, p);
        break;
      default:
        this.renderHttpFields(wrap, p);
    }
  }

  private renderClaudeCodeFields(wrap: HTMLElement, p: Provider): void {
    const save = () => this.plugin.saveSettings();
    new Setting(wrap)
      .setName("Claude Code command")
      .setDesc("Usually just “claude”. Set a full path if it isn't found. Log in once by running `claude` in a terminal — the plugin reuses that login.")
      .addText((t) =>
        t.setPlaceholder("claude").setValue(p.command).onChange(async (v) => {
          p.command = v.trim();
          await save();
        }),
      );
    new Setting(wrap)
      .setName("Model")
      .setDesc("Alias or ID passed to --model, such as opus, sonnet or a full model ID. Leave empty for the CLI default.")
      .addText((t) =>
        t.setPlaceholder("(CLI default)").setValue(p.model).onChange(async (v) => {
          p.model = v.trim();
          await save();
        }),
      );
    this.renderEffort(wrap, p);
  }

  private renderCodexFields(wrap: HTMLElement, p: Provider): void {
    const save = () => this.plugin.saveSettings();
    new Setting(wrap)
      .setName("Codex command")
      .setDesc("Usually just “codex” (npm i -g @openai/codex). Log in once with `codex login` — the plugin reuses that login. Runs with a read-only sandbox and no approvals.")
      .addText((t) =>
        t.setPlaceholder("codex").setValue(p.command).onChange(async (v) => {
          p.command = v.trim();
          await save();
        }),
      );
    new Setting(wrap)
      .setName("Model")
      .setDesc("Passed to --model. Leave empty for the CLI's default.")
      .addText((t) =>
        t.setPlaceholder("(CLI default)").setValue(p.model).onChange(async (v) => {
          p.model = v.trim();
          await save();
        }),
      );
  }

  private renderAcpFields(wrap: HTMLElement, p: Provider): void {
    const save = () => this.plugin.saveSettings();
    new Setting(wrap)
      .setName("Agent command")
      .setDesc("Command line that starts an ACP agent on stdio. The placeholder is the Claude Code ACP adapter; Gemini CLI and Codex offer ACP modes as well.")
      .addText((t) =>
        t.setPlaceholder("npx -y @agentclientprotocol/claude-agent-acp").setValue(p.command).onChange(async (v) => {
          p.command = v.trim();
          await save();
        }),
      );
    new Setting(wrap)
      .setName("Allow tools")
      .setDesc("Auto-approve the agent's permission requests (reading files, running commands in your vault folder). Off = every tool request is rejected; the agent just rewrites text.")
      .addToggle((t) =>
        t.setValue(p.allowTools).onChange(async (v) => {
          p.allowTools = v;
          await save();
        }),
      );
    wrap.createEl("p", {
      cls: "setting-item-description",
      text: "The agent process is kept alive for 10 minutes between edits so follow-up edits are fast. Model and login are configured in the agent itself (e.g. run `claude` and use /login and /model).",
    });
  }

  private renderEffort(wrap: HTMLElement, p: Provider): void {
    const save = () => this.plugin.saveSettings();
    new Setting(wrap)
      .setName("Effort")
      .setDesc("How hard the model thinks. Lower is faster; raise it for tricky rewrites. Ignored on Haiku.")
      .addDropdown((d) =>
        d
          .addOptions({ low: "Low", medium: "Medium", high: "High", xhigh: "Extra high", max: "Max" })
          .setValue(p.effort)
          .onChange(async (v) => {
            p.effort = v as Effort;
            await save();
          }),
      );
  }

  private renderHttpFields(wrap: HTMLElement, p: Provider): void {
    const save = () => this.plugin.saveSettings();

    new Setting(wrap)
      .setName("Base URL")
      .setDesc(
        p.type === "anthropic"
          ? "Leave empty for api.anthropic.com. Only set this for a proxy."
          : "Include the /v1 suffix. For a remote machine use its IP or hostname, e.g. http://192.168.1.20:8765/v1 (bridge) or :8642/v1 (Hermes).",
      )
      .addText((t) =>
        t
          .setPlaceholder(p.type === "anthropic" ? "https://api.anthropic.com" : "http://host:port/v1")
          .setValue(p.baseUrl)
          .onChange(async (v) => {
            p.baseUrl = v.trim().replace(/\/+$/, "");
            await save();
          }),
      );

    new Setting(wrap)
      .setName("API key")
      .setDesc(p.type === "anthropic" ? "From console.anthropic.com." : "Sent as “Authorization: Bearer …”. For the bridge this is its --key; for Hermes it's API_SERVER_KEY. Leave empty if the server needs none.")
      .addText((t) => {
        t.inputEl.type = "password";
        t.inputEl.autocomplete = "off";
        t.setValue(p.apiKey).onChange(async (v) => {
          p.apiKey = v.trim();
          await save();
        });
      });

    new Setting(wrap)
      .setName("Model")
      .setDesc(
        p.type === "anthropic"
          ? "claude-opus-5 (default), claude-sonnet-5 (faster/cheaper), claude-haiku-4-5 (fastest)."
          : "The model name the server expects. OpenAI: gpt-6-astra. Bridge: “claude” (or opus/sonnet/haiku). Hermes: “hermes-agent”. Use Test to list what's available.",
      )
      .addText((t) =>
        t.setValue(p.model).onChange(async (v) => {
          p.model = v.trim();
          await save();
        }),
      );

    if (p.type === "anthropic") this.renderEffort(wrap, p);

    new Setting(wrap)
      .setName("Extra headers")
      .setDesc("Optional. One “name: value” header per line, for example X-Hermes-Session-Key: notes")
      .addTextArea((t) => {
        t.inputEl.rows = 2;
        t.setValue(p.headers).onChange(async (v) => {
          p.headers = v;
          await save();
        });
      });
  }
}
