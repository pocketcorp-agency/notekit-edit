import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
Notekit Edit — Obsidian plugin. Bundled with esbuild; source is in src/.
*/`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  platform: "browser",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

// The bridge is a standalone Node script (no Obsidian), built from the same sources.
const bridge = await esbuild.context({
  entryPoints: ["src/bridge.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: "bridge/claude-bridge.cjs",
  banner: { js: "#!/usr/bin/env node\n/* Claude Code / Codex bridge for the Notekit Edit Obsidian plugin. Source: src/bridge.ts */" },
  logLevel: "info",
  minify: false,
});

if (prod) {
  await context.rebuild();
  await bridge.rebuild();
  process.exit(0);
} else {
  await context.watch();
  await bridge.watch();
}
