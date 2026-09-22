// Prints the CHANGELOG.md section for the given version (used as the GitHub release body).
import { readFileSync } from "node:fs";
const version = process.argv[2];
const lines = readFileSync("CHANGELOG.md", "utf8").split("\n");
const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
if (start < 0) { console.error(`no changelog section for ${version}`); process.exit(1); }
let end = lines.findIndex((l, i) => i > start && l.startsWith("## ["));
if (end < 0) end = lines.length;
process.stdout.write(lines.slice(start + 1, end).join("\n").trim() + "\n");
