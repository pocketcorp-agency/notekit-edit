import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: { parserOptions: { project: "./tsconfig.json" } },
    rules: {
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          // Product names and acronyms that appear in UI text and keep their capitalisation.
          brands: ["Notekit Edit", "Notekit", "Claude Code", "Claude", "Codex", "Anthropic", "OpenAI", "ChatGPT", "Hermes", "Ollama", "Gemini", "Haiku", "Obsidian", "British English"],
          acronyms: ["ACP", "AI", "API", "CLI", "ID", "QR", "URL", "VPN"],
          // Placeholders that are literal commands or URLs, not prose.
          ignoreRegex: ["^(claude|codex)$", "^npx ", "^https?://", "^obsidian://"],
        },
      ],
    },
  },
  {
    // Backend code shared with the Node bridge (bridge/claude-bridge.cjs): it runs outside Obsidian,
    // where `window` does not exist. The plugin only reaches it on desktop, behind Platform.isDesktopApp,
    // and resolves Node modules lazily through `nodeRequire()` in process.ts.
    files: ["src/process.ts", "src/acp.ts", "src/claude-cli.ts", "src/codex-cli.ts"],
    rules: {
      "obsidianmd/prefer-window-timers": "off",
      "obsidianmd/no-global-this": "off",
    },
  },
  {
    // ai.ts streams server-sent events, which `requestUrl` cannot do; it uses `fetch` for that and
    // falls back to `requestUrl` when the browser-level request fails (CORS, mixed content).
    files: ["src/ai.ts"],
    rules: {
      "no-restricted-globals": [
        "warn",
        { name: "app", message: "Avoid using the global app object. Instead use the reference provided by your plugin instance." },
        { name: "localStorage", message: "Prefer `App#saveLocalStorage` / `App#loadLocalStorage` functions to write / read localStorage data that's unique to a vault." },
      ],
    },
  },
  // bridge.ts is a standalone Node script (console output is its UI), not plugin code.
  { ignores: ["main.js", "bridge/", "src/bridge.ts", "node_modules/", "esbuild.config.mjs", ".test-build/", "docs/", "scripts/", "version-bump.mjs", "tests/"] },
);
