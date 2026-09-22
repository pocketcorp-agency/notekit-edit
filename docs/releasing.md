# Releasing

## Versioning

Notekit Edit follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: settings or behaviour change in a way that needs user action.
- **MINOR**: new features, new agent types, new commands.
- **PATCH**: fixes and internal changes.

Versions are plain `MAJOR.MINOR.PATCH`, no `v` prefix, because Obsidian matches the git tag against
`manifest.json` exactly. Three files carry the version and must agree: `package.json`,
`manifest.json` and `versions.json` (which maps each release to the minimum Obsidian version); the
ACP `clientInfo.version` in `src/acp.ts` carries it too. `npm run check-version` enforces this and
runs in CI.

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

   If you cannot push tags (for example from an environment whose credentials only allow branch
   pushes), push the commit, then open **Actions > Release > Run workflow** on GitHub, pick the
   branch and enter the version. The workflow creates the tag on that commit itself.

4. The **Release** workflow builds the plugin, checks that the tag equals the manifest version and has
   a changelog section, and publishes a GitHub release with exactly `main.js`, `manifest.json` and
   `styles.css` attached, the three files Obsidian downloads. The bridge is not a release asset; it is
   committed as `bridge/claude-bridge.cjs` and used straight from the repository.

If `minAppVersion` changes, edit it in `manifest.json` before bumping so `versions.json` records it.

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request: lint,
  type-check, tests, build, version check; it uploads the built bundle as an artifact for 14 days.
- **Release** (`.github/workflows/release.yml`) runs on semantic-version tags as described above.
- **Dependabot** opens monthly grouped pull requests for npm dev dependencies and GitHub Actions.

## Community plugin list

Submission happens on the Obsidian community site, not through a pull request any more
(the old flow edited `community-plugins.json` in `obsidianmd/obsidian-releases`).

Before submitting, make sure that:

- the repository is public and has `README.md`, `LICENSE` and `manifest.json` in its root;
- a GitHub release exists whose tag equals `manifest.json`'s version exactly (`0.2.1`, no `v`), with
  `main.js`, `manifest.json` and `styles.css` attached as individual assets, not a zip;
- the plugin `id` is unique across the directory and does not contain "obsidian" (`notekit-edit`);
- `npm run lint` is clean: it runs `eslint-plugin-obsidianmd`, the same guideline rules the reviewers
  apply.

Then:

1. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account.
2. Link the GitHub account that owns the repository, so ownership can be verified.
3. Add the plugin by repository (`pocketcorp-agency/notekit-edit`). The listing's name, author and
   description come from `manifest.json`; the detail page renders the repository's `README.md`.
4. Wait for the automated validation and the review. If changes are requested, fix them, bump the
   version and publish a new release, then reply on the submission.

Until the plugin is listed, users can install it with
[BRAT](https://obsidian.md/plugins?id=obsidian42-brat) by pointing it at `pocketcorp-agency/notekit-edit`,
or by copying `main.js`, `manifest.json` and `styles.css` from a release into
`<vault>/.obsidian/plugins/notekit-edit/`.

After approval, Obsidian reads new versions straight from the GitHub releases: tagging a release is all
a future update needs.

### What reviewers look at in this plugin

- It spawns local processes (`claude`, `codex`, an ACP agent) on desktop. `canSpawn()` gates that, and
  the agent cards say it is desktop only, so the mobile build never tries.
- It sends note content to a third-party endpoint chosen by the user. The README and
  [agents.md](agents.md) state what is sent and where; nothing is sent until an agent is configured.
- API keys live in the vault's plugin data. That is documented in the README's privacy section.
