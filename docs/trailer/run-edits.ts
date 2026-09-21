/**
 * Runs the trailer's three edits through the plugin's real backends and writes the
 * outputs to docs/trailer/outputs/. Usage (from the repo root):
 *   npx esbuild docs/trailer/run-edits.ts --bundle --platform=node --format=cjs --external:obsidian --outfile=docs/trailer/run-edits.cjs && node docs/trailer/run-edits.cjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { streamClaudeCli } from "../../src/claude-cli";
import { streamCodexCli } from "../../src/codex-cli";

(globalThis as { require?: unknown }).require ??= require;

const note = readFileSync("docs/trailer/note.md", "utf8");
const SYSTEM_EDIT = "You are an inline editing assistant inside Obsidian. Output ONLY the replacement for the selected passage, keep Markdown, no preamble, no code fences.";
const SYSTEM_INSERT = "You are an inline writing assistant inside Obsidian. Output ONLY the text to insert at <cursor/>, keep Markdown, no preamble, no code fences.";

const selection = note.split("\n").find((l) => l.startsWith("Saturday"))!;
const [before, after] = note.split(selection);
const cursorAt = note.indexOf("## Packing list") + "## Packing list\n\n".length;

async function collect(gen: AsyncIterable<{ type: string; text: string }>): Promise<{ text: string; thinking: string }> {
  let text = "", thinking = "";
  for await (const ev of gen) (ev.type === "text" ? (text += ev.text) : (thinking += ev.text));
  return { text, thinking };
}

(async () => {
  mkdirSync("docs/trailer/outputs", { recursive: true });
  const sig = new AbortController().signal;

  const edit = await collect(streamClaudeCli({ command: "claude", model: "", effort: "medium", cwd: homedir() }, SYSTEM_EDIT,
    `<note>\n<before>\n${before}\n</before>\n<selection>\n${selection}\n</selection>\n<after>\n${after}\n</after>\n</note>\n\n<instruction>\nSplit into short sentences and make it a bullet list\n</instruction>`, sig));
  writeFileSync("docs/trailer/outputs/1-edit-claude-code.txt", edit.text.trim() + "\n");
  console.log("edit →\n" + edit.text.trim());

  const insert = await collect(streamCodexCli({ command: process.env.CODEX ?? "codex", model: "", cwd: homedir() }, SYSTEM_INSERT,
    `<note>\n<before>\n${note.slice(0, cursorAt)}\n</before>\n<cursor/>\n<after>\n${note.slice(cursorAt)}\n</after>\n</note>\n\n<instruction>\nAdd a packing list for 4 days of mild weather, walking a lot\n</instruction>`, sig));
  writeFileSync("docs/trailer/outputs/2-insert-codex.txt", insert.text.trim() + "\n");
  if (insert.thinking) writeFileSync("docs/trailer/outputs/2-insert-codex-thinking.txt", insert.thinking.trim() + "\n");
  console.log("insert →\n" + insert.text.trim());
})().catch((e) => { console.error(e); process.exit(1); });
