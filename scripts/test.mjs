// Bundles each tests/*.test.ts with esbuild (aliasing `obsidian` to a small mock) and runs it under Node.
import esbuild from "esbuild";
import { readdirSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const outDir = ".test-build";
mkdirSync(outDir, { recursive: true });
const tests = readdirSync("tests").filter((f) => f.endsWith(".test.ts")).sort();
let failed = 0;
for (const t of tests) {
  const outfile = join(outDir, t.replace(/\.ts$/, ".mjs"));
  await esbuild.build({
    entryPoints: [join("tests", t)], bundle: true, platform: "node", format: "esm", target: "node18", outfile, logLevel: "warning",
    alias: { obsidian: "./tests/mocks/obsidian.ts" },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  });
  const r = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  if (r.status !== 0) { failed++; console.error(`FAILED: ${t}`); }
}
if (failed) { console.error(`${failed} test file(s) failed`); process.exit(1); }
console.log(`${tests.length} test file(s) passed`);
