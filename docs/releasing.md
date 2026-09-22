# Releasing

## Versioning

Obsidianize Edit follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: settings or behaviour change in a way that needs user action.
- **MINOR**: new features, new agent types, new commands.
- **PATCH**: fixes and internal changes.

Versions are plain `MAJOR.MINOR.PATCH`, no `v` prefix, because Obsidian matches the git tag against
`manifest.json` exactly. Three files carry the version and must agree: `package.json`,
`manifest.json` and `versions.json` (which maps each release to the minimum Obsidian version).
`npm run check-version` enforces this and runs in CI.

`CHANGELOG.md` follows Keep a Changelog. Every user-facing change goes under **Unreleased** as it is
merged; the release step turns that section into the version's section.

## Cutting a release

1. Make sure `main` is green and **Unreleased** in `CHANGELOG.md` describes the release.
2. Bump the version. This runs lint, type-check and tests first, updates `manifest.json`,
   `versions.json` and the changelog, commits and creates the tag:

   ```bash
   npm version minor          # or patch / major / 1.2.3
   ```

3. Push the commit and the tag:

   ```bash
   git push --follow-tags
   ```

4. The **Release** workflow builds the plugin, checks that the tag equals the manifest version and has
   a changelog section, and publishes a GitHub release with `main.js`, `manifest.json`, `styles.css`
   and `bridge/claude-bridge.cjs` attached. Obsidian installs exactly those three plugin files.

If `minAppVersion` changes, edit it in `manifest.json` before bumping so `versions.json` records it.

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request: lint,
  type-check, tests, build, version check; it uploads the built bundle as an artifact for 14 days.
- **Release** (`.github/workflows/release.yml`) runs on semantic-version tags as described above.
- **Dependabot** opens monthly grouped pull requests for npm dev dependencies and GitHub Actions.

## Community plugin list

The first submission is a pull request to
[obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) adding this entry to
`community-plugins.json`:

```json
{
  "id": "obsidianize-edit",
  "name": "Obsidianize Edit",
  "author": "pocketcorp",
  "description": "Select text or place the cursor, tell Claude or Codex what to write or change, and watch it stream into the note. Uses your existing Claude/ChatGPT subscription or an API key.",
  "repo": "pocketcorp-agency/obsidianize-edit"
}
```

Later releases only need the tag; Obsidian reads new versions from the GitHub releases. Note that the
review bot rejects plugin names containing "Obsidian"; "Obsidianize" trips that check, so the listed
name may have to differ from the product name.
