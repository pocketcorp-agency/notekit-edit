import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: { parserOptions: { project: "./tsconfig.json" } },
  },
  // bridge.ts is a standalone Node script (console output is its UI), not plugin code.
  { ignores: ["main.js", "bridge/", "src/bridge.ts", "node_modules/", "esbuild.config.mjs"] },
);
