// Runs from `npm version <x.y.z|major|minor|patch>`: syncs manifest.json and versions.json with
// package.json and turns the CHANGELOG "Unreleased" section into the new version's section.
import { readFileSync, writeFileSync } from "node:fs";

const targetVersion = process.env.npm_package_version;
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");

const today = new Date().toISOString().slice(0, 10);
let changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes(`## [${targetVersion}]`)) {
  changelog = changelog.replace("## [Unreleased]\n", `## [Unreleased]\n\n## [${targetVersion}] - ${today}\n`);
  const repo = "https://github.com/pocketcorp-agency/notekit-edit";
  const prev = changelog.match(/\[Unreleased\]: .*compare\/([\d.]+)\.\.\.HEAD/)?.[1];
  changelog = changelog.replace(/\[Unreleased\]: .*\n/, `[Unreleased]: ${repo}/compare/${targetVersion}...HEAD\n[${targetVersion}]: ${repo}/compare/${prev ?? targetVersion}...${targetVersion}\n`);
  writeFileSync("CHANGELOG.md", changelog);
}
console.log(`version-bump: ${targetVersion} (minAppVersion ${minAppVersion})`);
