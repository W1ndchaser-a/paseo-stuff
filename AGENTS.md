# Paseo Stuff — development rules

## Scope and layout
- This repository can contain multiple independent Paseo plugins under `plugins/<name>/`.
- Each plugin owns its manifest, package.json, package-lock.json, README, LICENSE, tests and runtime modules.
- Keep plugins independently installable. Do not import sibling plugins or rely on root-hoisted dependencies.
- Use npm with each plugin's lockfile; run installation and verification from that plugin's directory.
- Root `docs/` contains accepted design, host compatibility evidence and cross-plugin decisions. Do not create a shared runtime framework before at least two plugins actually need it.
- Do not commit generated bundles, node_modules, credentials, local host configuration or personal conversation fixtures.
- Preserve upstream licenses and record exact provenance for forks and vendored fixtures.

## Publication direction
- `geoqiao/paseo-stuff` is the canonical development and release repository for all plugins in this project. Keep each plugin independently installable from its subdirectory.
- Maintain only Readable Agent Activity, DeepSeek Harness and Math Renderer. Their source and release records live in this repository.
- Paseo's official registry (`getpaseo/plugins`, paseo.sh/plugins) lists these three plugins as `geoqiao/<slug>`. npm records receive automatic bump PRs; a Git record changes only through a new submission or a PR against that record. Keep `OVERVIEW.md` beside each maintained plugin's manifest, following the registry's overview contract (no install commands, badges or em dashes), and keep it in the npm `files` list for npm-distributed plugins.
- Paseo 0.11 resolves a bare `owner/name` source through the registry. Document direct Git installs with the `git:` prefix.
- Publish npm packages only through `.github/workflows/publish-npm.yml` (trusted publishing, triggered by a GitHub release). Do not publish from a local machine or add npm tokens. One exception: npm trust requires an existing package, so the repository owner publishes a new package's first version manually. Agents prepare and check that first tarball but do not publish it. Agents may configure trust: run `npm login --auth-type=web` and `npm trust github <package> --file publish-npm.yml --repo geoqiao/paseo-stuff --allow-publish` in a pseudo-terminal, open the printed URLs, and let the owner complete each browser login and 2FA confirmation. Verify with `npm trust list <package>` or a provenance-signed publish by GitHub Actions.
- Preserve existing plugin/catalog IDs when migrating source pointers. Old standalone repositories retain history and migration notices, not parallel ongoing development.
- Distinguish submitted PRs from accepted/deployed catalog entries. Fix genuine upstream admission problems in separate Cafe PRs; do not work around them by duplicating plugins or weakening checks.

## Paseo contracts
- Current verification target is stable Paseo app/daemon 0.16.0. Keep SDK devDependencies pinned to each plugin's minimum supported line (0.13.2 for Readable Agent Activity and Math Renderer, 0.11.4 for DeepSeek Harness) and install the 0.16.0 SDK without saving for the target check. Move the target to each new stable Paseo release after checking it. Verify versions before introducing APIs; do not label beta verification as stable-release acceptance.
- DeepSeek Harness follows the newest published official DSH release (the newer of npm `latest` and `next`; currently 0.2.2-rc.3, whose CLI requires Node >=24.9.0). Test a new DSH release before listing it as tested.
- Paseo 0.8 to 0.10 reject unknown `paseo-plugin.json` fields. Add `translations`, `name`, `icon` or `media` only to plugins whose minimum is 0.11.0 or later. Keep a Simplified Chinese `OVERVIEW.zh-CN.md` beside each maintained plugin's `OVERVIEW.md`, list it in the npm `files`, and update both together.
- Readable Agent Activity and Math Renderer support only current Paseo (user decision, 2026-10-26): Paseo 0.8 to 0.12 are dropped. Do not add compatibility code, fixtures or tests for releases below their minimum; pin host fixtures to the target release.
- Declare `requirements.paseo` as a minimum (`>=`), following the Paseo requirements reference. Raise it only when adopting a newer API or when the user drops older releases; add an upper bound only for a release known to be incompatible. Record the actually tested versions in each plugin's docs, not in the range.
- Fetch https://paseo.sh/llms.txt, then the version-matching plugin reference before adopting unfamiliar APIs.
- Client entries: `index.client.tsx`, client UI under `client/`.
- Optional daemon entry: `index.server.ts`, daemon-only modules under `server/`.
- Pure data/contracts under `shared/`; no other root code modules.
- Use public SDK modules only. Never import host internals in a production plugin, inspect host React state/DOM, or read private app storage to infer settings.
- Use React Native primitives and host UI. Derive colors from theme.colors and layout from layout.compact/platform.
- Host Icon exposes name/size/color, not stroke width (through 0.14.0). Choose simple supported Lucide shapes; do not claim an unsupported strokeWidth parameter.
- Keep transforms synchronous, deterministic and JSON-safe. Preserve source information and stable item identity.
- Host chat display preferences take precedence (0.14: Full, Collapse tool calls, Collapse turns; 0.13: Full detail, Summary). Never silently force Full display or replace grouped tool-call rows with single calls. Leave turn-starting rows (agent messages, heartbeats) native.
- A compatibility gap must be documented and tested, not hidden behind a guessed configuration value.
- Since 0.9, timeline transforms run before Summary grouping and plan suppression (0.9 to 0.12 also split native Markdown afterwards; 0.13 does not). In 0.16.0, Collapse tool calls groups native reasoning with tool calls, and Collapse turns recognises transformed assistant replies through sourceKind. Upstream reply-folding PR #8811 is verified in the stable 0.16.0 host pipeline. Transformed work grouping remains tracked by upstream issue #8875. Pass native plan tools through. Math retains native streaming, renders formula-free blocks with the SDK `Markdown` component and offers native-reply mode because chat Find cannot match formula source.
- Preserve per-card manual-only expansion through streaming and status updates.

## Safety and lifecycle
- Plugins are trusted unsandboxed code. Avoid network/process/filesystem privileges for presentation-only work.
- Return cleanup; unregister contributions and stop all resources owned by the plugin.
- Preserve installation enable/disable state. Do not restart the daemon to load source edits.
- Typecheck before install/reload. Use an explicit target host. Do not auto-enable a disabled plugin.
- Repository creation/development does not authorize publishing, remote creation, or replacing the installed Paseo app.

## Daily maintenance
- Use one Paseo schedule at 08:00 Asia/Shanghai. The checked-in entrypoint is `.github/maintenance/prompt.md`; detection and coordination live beside it. Local state and evidence stay in `.scratch/upstream-compat-watch/`.
- Track issue comments, reviews, PR head/check changes, official Paseo/DSH releases, registry versions and explicitly tracked upstream issues/PRs. Unchanged waiting items do not trigger repeated testing or comments.
- Keep observed, reviewed, verified, released and registry state separate. A merged upstream change needs verification in a released tag before removing that release's workaround.
- Preserve public-reply, merge, release and local-install authorization boundaries recorded in the maintenance prompt. No additional schedules or heartbeats.

## Verification
- For changed plugins: npm run typecheck, npm run lint, npm test.
- Cover malformed/empty/large data, copying, streaming, user-controlled folding, narrow layouts and light/dark colors.
- Test every chat display mode against the supported host pipeline; distinguish host integration tests from mocked renderer tests.
- Record actual desktop/mobile checks and limitations accurately. Do not call mocked compact props an on-device mobile test.
- Keep docs, runtime manifest and install instructions consistent with tested support.
