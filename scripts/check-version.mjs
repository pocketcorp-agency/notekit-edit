// Guards the release invariants: package.json, manifest.json and versions.json agree, and the tag (if any) matches.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
const problems = [];
if (pkg.version !== manifest.version) problems.push(`package.json (${pkg.version}) and manifest.json (${manifest.version}) disagree`);
if (!versions[manifest.version]) problems.push(`versions.json has no entry for ${manifest.version}`);
else if (versions[manifest.version] !== manifest.minAppVersion) problems.push(`versions.json[${manifest.version}] should be ${manifest.minAppVersion}`);
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) problems.push(`version ${manifest.version} is not plain MAJOR.MINOR.PATCH (Obsidian requires it)`);
const tag = process.env.RELEASE_TAG;
if (tag && tag !== manifest.version) problems.push(`git tag ${tag} does not match manifest version ${manifest.version}`);
const acp = readFileSync("src/acp.ts", "utf8");
if (!acp.includes(`version: "${manifest.version}"`)) problems.push(`src/acp.ts clientInfo.version is not ${manifest.version}`);
const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes(`## [${manifest.version}]`)) problems.push(`CHANGELOG.md has no "## [${manifest.version}]" section`);
if (problems.length) { for (const p of problems) console.error(`version check: ${p}`); process.exit(1); }
console.log(`version check: ${manifest.version} (minAppVersion ${manifest.minAppVersion}) ok`);
