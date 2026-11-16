# Verification and limits

## Paseo 0.16.0 stable target (2026-11-16)

- Typecheck, lint and **251 tests** pass with the minimum pinned SDK and the no-save **0.16.0 SDK**.
- Production-provider regression tests pass through the public SDK. The official DSH rc.3 initialization and fresh-process persistence evidence below remains tied to SDK 0.15.4.
- UI host fixtures use release commit `c54bc39e7997c03a07402c09df2e825889432557`; no runtime plugin code or minimum requirement changes.
- These are SDK and offline integration checks. No new desktop, web-client, native-mobile or real-model acceptance is claimed.
- The CI package-load and isolated daemon checks now target **0.16.0**.


## DSH 0.2.2-rc.3 (2026-11-14)

- Official npm `latest` remains 0.2.2-rc.1; `next` selects **0.2.2-rc.3**.
  The full official CLI closure, including ACP, Session and JSONL persistence,
  resolves to rc.3. Node **24.18.0** runs the CLI; its minimum remains 24.9.0.
- Compare complete rc.2 and rc.3 release-tag trees. CLI, ACP, Session and
  persistence implementation sources are unchanged. The release adds an optional
  DeepSeek chat import plugin and fixes desktop updating. The published ACP,
  Session and persistence JavaScript also matches rc.2 byte for byte, retaining
  all **63** v4 event types. The rc.2 catalog fixture keeps its exact provenance.
- The unchanged **beta.21 npm runtime**, through the public **0.15.4 SDK**,
  passes official rc.3 status, ACP initialization, image capability repair,
  model/reasoning discovery, configuration and session listing. Three separate
  processes open, batch-append synthetic text and Team-mode records through
  official persistence APIs, then reopen with history replay. Both messages and
  native session identity survive with no recovery warning. Events validate
  against `ProviderEventSchema`; every provider/child process closes.
- Keep context-resume, reasoning-ID and image-startup adapters: rc.3 retains
  their upstream conditions. No runtime change or plugin release is needed.
  The Windows CI tool lock selects rc.3 for its real npm launcher/isolated daemon
  check. No paid calls, local installation changes or new desktop/native-mobile
  UI acceptance are part of this verification.
- Evidence: maintenance `evidence/2026-11-14/` contains the complete tagged-tree
  audit, published-package comparison, official open/batch/reopen results and
  PR/CI records. Minimum SDK pins remain **0.11.4**; stable target is **0.15.4**.

## Beta.21 — DSH 0.2.2-rc.2 (2026-11-13)

- Official npm `latest` remains 0.2.2-rc.1; `next` selects **0.2.2-rc.2** for
  both CLI and ACP. Install the full official CLI closure with the checked-in
  CI tool lock and `--ignore-scripts`, using Node **24.18.0**. CLI, ACP, Session
  and JSONL persistence all resolve to rc.2; ACP SDK remains **1.4.0**.
- Compare the independently published Session catalog with rc.1: **63 events**,
  adding only `team/mode`. Its payload is `{ enabled: boolean }`; the official
  Team service persists it when toggling Team mode. It has no transcript
  projection. Before the fix, the synthetic catalog regression returns
  `unsupported` and drops all six text/tool replay frames. The reader now skips
  that metadata, preserving the complete history and unchanged log bytes.
- Catalog provenance records the published package integrity, file and license.
  Cover all **59 auxiliary types**, plus `team/mode` through the production
  provider's metadata recovery regression. Unknown required records, malformed
  data, image history and existing recovery bounds keep their previous behavior.
- Typecheck, lint and **251 tests** pass with both pinned **0.11.4** and no-save
  **0.15.4** SDKs. The checked-in development pins remain 0.11.4.
- Using the public 0.15.4 SDK, the production provider reports available status,
  initializes the actual official ACP process, negotiates messages/images,
  configuration/list/persistence/permissions, discovers the default model and
  `off/low/high/max` reasoning options, and applies reasoning changes. Collected
  events pass `ProviderEventSchema`.
- Open a configured session, close the connection and dispose the provider. In
  a separate Node process, open its actual official JSONL persistence handle,
  use the published `Session.append(array)` API to batch Team enable/disable,
  turn/step boundaries and synthetic user/assistant text, then flush and close.
  A third process reopens the same persistence through the production provider
  with history requested: native identity and both synthetic messages survive,
  session listing succeeds and no recovery notice is emitted. All resources
  close without model calls. Homes and logs contain only synthetic data; no
  user credentials or installed runtime are used.
- The official ACP/default-model mismatch remains present, so image-startup
  repair stays enabled. Existing context-resume and reasoning-ID adapters also
  remain. This check makes no paid calls and adds no desktop/native-mobile UI
  acceptance. Windows uses the actual rc.2 npm launcher in the PR's isolated
  daemon CI job; manual Windows UI remains untested.
- Evidence: maintenance `evidence/2026-11-13/` contains SDK check logs,
  `official-open.json`, `official-batch.json`, `official-reopen.json`, scripts
  and package provenance. Earlier verification sections retain their historical
  versions and limits.

## Paseo 0.16.0-beta.1 prerelease review (2026-11-11)

- Typecheck, lint and **250 tests** pass with the no-save beta SDK. The test
  helper accepts optional `ProviderConfigState.settings`, matching the public
  beta contract; minimum-SDK checks also pass. No production adapter changed.
- The beta ACP shim applies configuration in the peer's declared order and
  prefers an option with ID `model` among controls in that category. Its load,
  resume and replay paths remain intact. Existing fake-peer coverage passes;
  official DSH **0.2.2-rc.1** has not changed, so its earlier no-model-call
  factory/persistence checks were not repeated.
- This is prerelease SDK acceptance, separate from stable **0.15.4**. No beta
  daemon load, live model call, desktop or native mobile check was performed.
- Local evidence: maintenance `evidence/2026-11-11/deepseek-harness-beta-tests.json`
  and the tagged beta SDK/source audit.


## Paseo 0.15.4 stable target (2026-11-11)

- Typecheck, lint and all **250 tests** passed with the no-save **0.15.4**
  client, plugin and protocol SDKs on 2026-11-10. The minimum SDK pin stays
  **0.11.4**. Production code and plugin versions are unchanged.
- The published ACP interfaces remain compatible. Official DSH stays at
  **0.2.2-rc.1**; its existing factory/persistence evidence below used SDK 0.15.3.
  No new DSH release or model-call verification was required.
- Stable 0.15.4 still lacks upstream #8811 reply folding and #8756 mirror
  installation fixes. Existing stable-release workarounds remain in place.
- This target records SDK checks. No 0.15.4 live UI,
  isolated daemon load, native mobile or Windows acceptance was performed.
- Local evidence: `.scratch/upstream-compat-watch/evidence/2026-11-10/upstream-0.15.4/review.json`
  and `.scratch/upstream-compat-watch/evidence/2026-11-11/source-audit.json`.


## Beta.20 — v4 event coverage (2026-11-10)

- Compare the replay reader with the independently published
  `@deepseek-ai/dsh-session@0.2.2-rc.1` v4 catalog: 62 event types, of which
  four produce conversation/tool updates and 58 are omitted auxiliary records.
  The catalog fixture records the exact package, file and npm integrity, with
  the upstream MIT license alongside it. No personal transcript is a fixture.
- Cover every non-transcript event with a synthetic regression preserving all
  text/tool frames and the original log bytes. Additional tests cover unknown
  `ignorable: true` records with object, array, null, string, numeric and boolean
  payloads, required unknown records, missing/invalid envelopes, known messages
  marked ignorable and attempted surface changes. Production-provider tests
  require full history and no recovery notice for metadata/ignorable records.
- `npm run check` passes on Node 24.14.0 with the pinned Paseo 0.11.4 SDK and
  the no-save 0.15.3 SDK: typecheck, lint with no warnings/errors, and 250 tests
  in six files for each. Package/lock SDK pins remain unchanged. Installation
  uses the already documented `--ignore-scripts --legacy-peer-deps` flags.
- Read-only local sampling covers 472 v4 logs and 146,064 events, including
  historical test sessions. Before the patch, 65 logs return `unsupported`.
  With the production patch, 470 logs replay successfully and two retain the
  documented image-content limitation. Thirteen previously unhandled event
  types actually occur in this sample; 20 additional catalog types have only
  synthetic coverage. These counts are not a general failure-rate estimate.
- The originally reported session replays to 1,956 ACP updates. After a local
  hotfix and plugin-only reload on Paseo 0.15.3, reloading that idle agent returns
  a 1,341-item timeline; the macOS desktop visibly displays its old messages and
  tool history. The original persistence identity is preserved. Verification
  sends no new model prompt, does not restart the daemon, and does not rewrite
  existing transcript records. Native DSH resume may append its ordinary
  initialization records. That desktop check used a backed-up local runtime
  patch on the beta.19 registry installation.
- Image/attachment recovery, unknown required events, malformed replacements
  and the existing time/size limits retain their prior behavior. No fresh live
  model-turn, compact/mobile layout or native-mobile acceptance is claimed.
- Independent maintenance review of PR #53 on 2026-11-10 matched the fixture
  and reader allowlist to the published DSH session package and traced replay
  through the ACP bridge into the 0.15.3 SDK load window. Typecheck, lint and
  all 250 tests passed on Node 22.23.4 with no-save 0.15.3 SDKs. Minimum SDK
  pins remain 0.11.4. The same head passed CI on Node 22/24 with the pinned SDK,
  250 Windows tests, packed-package loading and an isolated Windows daemon
  smoke check. This review did not repeat the contributor's private-log or
  desktop checks and made no model calls.
- When updating supported DSH versions, refresh the independent published
  catalog fixture and review each new event's transcript/auxiliary role.

## Beta.19 — Paseo 0.15.3 and DSH 0.2.2-rc.1 (2026-11-07)

- Beta.19 includes model-selection replay and original-history recovery after
  compaction/pruning. The user's installations were not replaced, enabled,
  reloaded or restarted.
- Regressions preserve the full original transcript through repeated prefix
  compaction where the newer checkpoint precedes older retained messages.
  Replacement endpoints are nonnegative safe integers earlier than the marker;
  exact marker range, event type and compaction-ID checks remain. Unknown or
  malformed replacements retain the unsupported-history fallback.
- Read `https://paseo.sh/llms.txt`, then the tagged Paseo **v0.15.3**
  [plugin reference](https://github.com/getpaseo/paseo/blob/v0.15.3/public-docs/plugins/reference.md)
  and [provider reference](https://github.com/getpaseo/paseo/blob/v0.15.3/public-docs/plugins/providers.md).
  The daemon-resolved launch and public ACP provider interfaces remain compatible.
- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund`, then
  `npm run check`, passes with pinned **0.11.4** client/plugin/protocol SDKs:
  typecheck, lint (zero warnings/errors), **171 tests in six files**.
- Install the target with
  `npm install --ignore-scripts --legacy-peer-deps --no-save --package-lock=false --no-audit --no-fund @getpaseo/client@0.15.3 @getpaseo/plugin@0.15.3 @getpaseo/protocol@0.15.3`.
  The same `npm run check` passes. Both suites ran on macOS with Node **24.18.0**.
  Minimum SDK pins stay at 0.11.4; only the package version changes in the lockfile.
- Install the official **@deepseek-ai/dsh 0.2.2-rc.1** closure in an isolated
  temporary prefix with `--ignore-scripts`. CLI, ACP, ACP app, Session and JSONL
  persistence packages resolve to **0.2.2-rc.1**; ACP SDK remains **1.4.0**.
  npm `latest` and `next` both resolve to that CLI version.
- DSH's [release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1)
  and package engine require **Node >=24.9.0**. Real-package probes used isolated
  **Node 24.18.0**, launching the actual CLI through that executable. The plugin
  still supports Node 22.19+ for older DSH releases; the chosen DSH command must
  satisfy DSH's own newer runtime requirement.
- An unmodified official ACP process initializes with `session/list`,
  `session/resume`, `session/close`, HTTP MCP and no legacy `loadSession`.
  `session/list` returns an empty list in the fresh home. The unmodified ACP
  profile still advertises `image: false`; the production startup repair changes
  it to `image: true`. Its base/ACP default-model mismatch persists in rc.1.
- The production `createDeepSeekHarnessProvider` factory, using the installed
  **0.15.3** public SDK, reports available status, initializes and maps
  message/image/configure/list/persistence/permission capabilities. Commands and
  steering stay absent. Catalog discovery returns one default model,
  `["deepseek-official","deepseek-flash"]`, and `off/low/high/max` reasoning choices.
  All collected events pass the public `ProviderEventSchema`.
- Open a session with that model and reasoning `off`, close it and its connection,
  then reopen the same persistence through a new ACP process with history requested.
  Native identity is preserved; initialization bookkeeping leaves a valid empty
  displayed transcript and no recovery warning. Close the connection and dispose
  the provider; no probe-owned processes remain.
- DSH now records model changes through `AgentModel.select` in the ACP config
  path. Those v4 `model/selection` records are bookkeeping and are skipped.
  A targeted synthetic multi-frame regression inserts model/reasoning selections
  before and after text/tool events and requires identical complete replay.
  Real-package verification above covers persisted configured-session reopen;
  no model prompt, credential, tool execution or paid inference was used.
- Compared official tags **dsh-v0.2.1-rc.5**
  (`b830ec950faba0a46dda564be3e2d854afed94f1`) and **dsh-v0.2.2-rc.1**
  (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`) and published packages.
  Reasoning/answer IDs still share the native message ID; the suffix remains.
  Session format is still **v4** in `session.v4.jsonl.zstd`, with the same
  project/session layout and independently appended Zstandard frames.
  Native resume still supplies context without transcript replay.
- Compaction replay follows upstream positions in `session.surface.nodes`, not
  numeric sequence order. Repeated-prefix coverage exercises a newer checkpoint
  before an older retained turn; the complete original transcript, including full
  tool output, is identical before and after compaction, and the log is unchanged.
  Negative/forward endpoints, marker-range mismatches, wrong event/source types,
  wrong compaction IDs and unrelated replacements still fail safely.
- Local evidence: `/tmp/dsh-022rc1-verification/` contains the two check logs,
  install logs, official package/lock, tag comparison, raw/bridge ACP JSON,
  production-provider JSON and probe scripts. Temporary homes contain synthetic
  initialization/configuration data only, with no copied credentials.
- **Packed daemon load:** `npm pack` produces
  `paseo-deepseek-harness-0.1.0-beta.19.tgz`. Unpack into a temporary directory
  and install only its three locked runtime dependencies with
  `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`.
  The package loads as **running**, enabled and without an error, on actual
  **Paseo 0.15.3** through the installed app's bundled CLI/server.
- That daemon uses its own home,
  `<release-probe>/daemon-home` under a temporary `paseo-beta19-release-*`
  directory, explicit `127.0.0.1:6868` listener and disabled relay. Start with
  `paseo --json daemon start --home <isolated-home> --timeout 30`.
  Its clean environment uses a temporary OS home, temporary `DSH_HOME`, and
  `PATH` prefixed with Node **24.18.0** and the isolated official DSH binaries.
  The provider command explicitly launches that Node executable with official
  DSH **0.2.2-rc.1** and `--profile acp`.
- `paseo plugin ls deepseek-harness --home <isolated-home> --json` returns
  `status: "running"`.
  `paseo provider diagnostic deepseek-harness --home <isolated-home> --json`
  returns **Provider is available / Models: 1 / Status: Ready**.
  `paseo provider models deepseek-harness --thinking --home <isolated-home> --json`
  returns the opaque `deepseek-flash` route and `off/low/high/max` reasoning
  options. No Paseo agent, model prompt or tool execution is created.
- Stop with `paseo daemon stop --home <isolated-home> --timeout 20 --json`.
  Shutdown is graceful (`forced: false`), the plugin logs **Plugin stopped**,
  and status reports `localDaemon: "stopped"` with no PID. The daemon/launcher
  PIDs are gone and no listener remains on 6868. No Paseo agents, terminals,
  subagents, schedules or queued work were created. The temporary daemon key
  was removed after shutdown.
- Final release packed-load evidence is in the temporary release-probe directory:
  `pack.json`, `install.log`, `plugin.json`, `diagnostic.json`, `models.json`,
  `stop.json` and `stopped.json`. Summaries and the directory location are also
  retained outside temporary worktrees under
  `.scratch/upstream-compat-watch/evidence/2026-11-07/release-beta19-*`.
  Pack staging was restored; `node_modules` is reconstructible from the lockfile.
- **Boundary:** no 0.15.3 client/UI or real model turn was exercised.
  Real-model, session-history recovery across a daemon restart and image
  interpretation remain covered by the Paseo **0.14.0** / DSH **0.2.1-rc.5**
  checks below. Manual Windows and native mobile checks were not performed.

## Beta.18 — default ACP image startup (2026-10-31)

- Root cause confirmed in published **DSH 0.2.1-rc.5**: the base
  `agent-default-model` selects `deepseek-flash`, whose official model catalog
  declares text and image inputs. The ACP app still selects `deepseek-v4-flash`.
  ACP's `supportsAcpImagePrompts` checks that startup route during initialization,
  and `admitAcpPrompt` later rejects images if that connection did not advertise
  them, even after a session model change. The plugin already passed image
  bytes/MIME correctly; it did not suppress an affirmative ACP capability.
- The fix uses the public `dsh --dump-config` and `--patch` launcher options.
  A literal, recognized mismatch generates a private temporary overlay with the
  full original ACP config and the corrected model. This is necessary because
  DSH replaces the whole config map, rather than merging individual keys.
  No user configuration or installed DSH files are rewritten.
- Configuration dumps are bounded to five seconds and 256 KiB. Unreadable,
  oversized, malformed, disabled, expression-valued or ambiguous entries do not
  trigger a guessed correction. Different custom/default routes are unchanged.
  DSH still decides whether to advertise images and validates the actual model
  again at prompt admission. Custom profiles whose startup route disables images
  are not automatically rewritten into a different route.
- Typecheck, lint and **152 tests in six files** pass with both the pinned
  **0.11.4** SDK and the **0.14.0** SDK installed without saving.
- Automated checks cover config preservation, malformed/large data, explicit
  model selection, real synthetic-ACP initialization gates, image pass-through,
  private file permissions, overlay cleanup and disposal during config inspection.
- Live A/B used an isolated **Paseo 0.14.0** daemon at **127.0.0.1:6846**,
  relay disabled, a fresh DSH_HOME and **DSH 0.2.1-rc.5**. The published beta.17
  tarball, installed with production dependencies, rejected a PNG with
  `Provider does not support prompt.image`.
- The fixed production-only tarball accepted the same PNG through `paseo run`
  with only `--provider deepseek-harness`: no `--model`, no profile edits, no
  extra user launch flags. The actual answer read `DYUKTFJ` and correctly
  identified a red circle, blue square and green triangle, without tools.
  SHA-256 hashes of the DSH YAML configuration files were unchanged.
- The **0.14.0 web client** Add image flow then accepted a JPEG with a different
  random code, `ZPT8LRK`, and the same three shapes. No profile or model change
  was made in between. Browser bootstrap's failed probe of the main daemon
  was unrelated; the test connected explicitly to the isolated daemon.
- This checks real model interpretation and the normal default input path.
  It does not add image-history replay or vision support to text-only models.
  Native desktop/iOS/Android and real model calls on Windows are not verified.

## Beta.17 — replay recovery notices (2026-10-31)

- Node **24.18.0**, macOS, separate implementation worktree. Live checks used an
  isolated daemon and copied credentials; the user's installed plugin and daemon
  configuration were not changed.
- `npm run check` passes with the pinned **0.11.4** SDKs and with the
  **0.14.0** client/plugin/protocol SDKs installed without saving: typecheck,
  lint (0 warnings/errors) and **130 tests in five files** each. Dependencies
  were installed with `npm ci --legacy-peer-deps`: plain `npm ci` reports a
  pre-existing missing React peer in the lockfile. The lockfile changes only its
  package version.
- Production-provider integration uses the authored synthetic ACP peer, not a
  live daemon or model. It checks successful and header-only empty replay,
  oversized/image-containing/missing/corrupt logs, native load, failed native
  load/resume, configuration failure after resume, explicit `history: "skip"`,
  concurrent host session keys, two listeners, repeated native responses and
  connection closure both during resume and from an opened-event listener.
- A failed recovery produces one `session.notice` warning after
  `session.opened` and before `session.ready`, keyed by the Paseo session ID.
  It never produces a fake assistant message. Exact fixed wording and privacy
  assertions exclude transcript text, native session IDs, paths and credentials.
  A subsequent prompt completes normally after each recoverable log failure.
- Reader tests distinguish valid empty history from failure and cover classified
  reasons, malformed/unsupported content, file/decoded/record limits and deadline.
  Bridge tests retain pre-response replay and ensure a repeated response cannot
  produce duplicate history or a duplicate failure callback. Existing conservative
  replay execution and limits are unchanged; only notices are gated by requested
  history recovery.
- The image pass-through test checks exact bytes and MIME type at the synthetic
  ACP peer, alongside the existing `image=yes` turn test. It is not a real image
  interpretation test.

### Separately verified live image input, before the notice change

Release validation separately tested the beta.16 packed plugin on an isolated
**Paseo 0.14.0** daemon with **DSH 0.2.1-rc.5**. The default ACP configuration,
`acp.config.model=deepseek-v4-flash`, did not advertise `prompt.image`.
The check set `$DSH_HOME/profiles/acp/cordis.patch.yml` to:

```yaml
- id: acp
  config:
    provider: deepseek-official
    model: deepseek-flash
```

Creating another agent did not refresh the cached capabilities. After plugin
reload, a new agent using `["deepseek-official","deepseek-flash"]` identified
its model as **DeepSeek-V4.1-Flash**. With a PNG sent through the CLI, it correctly
read random code `22SHYYE`
and a red circle, blue square and green triangle without tools. After a daemon
restart, the timeline was empty because image content is unsupported by v4
replay, but the model recalled the code and shapes. This establishes context
restoration and the image replay limit; it does not verify the new notice UI.

Release validation also used the Paseo **0.14.0 web client** Add image flow to
upload a JPEG and send a prompt on the same `deepseek-flash` route. The model
correctly read a new random code, `PAFE9JJ`, and all three shapes without tools.
Both PNG CLI input and JPEG web upload were verified; the default ACP model was
not changed to claim image support.

### Separately verified live recovery notice

Release validation installed the implementation tarball with production-only
dependencies on an isolated **Paseo 0.14.0** daemon with **DSH 0.2.1-rc.5**.
After integration and the version bump, the final **beta.17** tarball also loaded
and recovered the unsupported-history notice after a real daemon restart.
The integrated source passed typecheck, lint and all 130 tests again with SDK 0.14.0.

- After an actual daemon restart, the image-containing session displayed one
  warning titled **Chat history unavailable**, with the exact description:
  "Context restored, but chat history could not be displayed because it contains
  a format or content that cannot be restored yet."
- Web-client screenshots confirmed readable notice text at a **1280 px light**
  viewport and **390 px light and dark** viewports. These are browser viewport
  checks, not native mobile-device or desktop-app tests.
- The warning remained visible with **Full**, **Collapse tool calls** and
  **Collapse turns** chat display. Successful text recovery showed no warning.
- A follow-up asking for the most recent image code, without tools, correctly
  returned `PAFE9JJ`. No duplicate notice appeared. The final beta.17 tarball
  repeated the context-recall check successfully.
- A text/tool session restored its original history and its later legitimate
  follow-up containing `lighthouse-6284`, with no observed replay regression.

**Not verified:** the desktop app, native iOS/Android clients or live model calls
on Windows. The automated suite and live checks cover different boundaries;
synthetic ACP tests alone do not establish daemon or UI behavior.

## Beta.16 — release check (2026-10-31)

- `npm run check` passes with the pinned 0.11.4 SDK: typecheck, lint and 108 tests.
- The beta.16 tarball was unpacked and its production dependencies installed with
  `npm ci --omit=dev`. It loaded as `running` on an isolated Paseo 0.14.0 daemon
  (port 6844, relay off, temporary home), with DSH 0.2.1-rc.5 and a separate DSH_HOME.
- A real tool turn read a synthetic marker. After a daemon restart, the CLI timeline
  was identical to the pre-restart timeline; a follow-up recalled the marker without tools.
- Runtime code is unchanged from #47. Its 0.14.0 web-client check below remains
  the UI evidence; this release check used the CLI, not desktop or native mobile.

## Beta.16 — Paseo 0.14.0 and DSH 0.2.1-rc.5 (2026-10-30)

- `npm run check` passes with the pinned **0.11.4** SDKs and with the **0.14.0**
  client/plugin/protocol SDKs installed without saving: typecheck, lint and
  **108 tests** each. The reasoning tests assert distinct reasoning and answer IDs
  and that only the answer keeps `messageId`; on 0.11.4 the IDs are unchanged.
- Isolated Paseo **0.14.0** daemon (CLI 0.14.0 from npm, temporary home,
  `127.0.0.1:6840`, relay off). The packed package (version still beta.15, with the
  unreleased changes), unpacked and installed with `npm ci --omit=dev`, ran beside
  Readable Agent Activity beta.14 and Math Renderer beta.8. Status `running`; the
  provider diagnostic reported it available and ready.
- **DSH 0.2.1-rc.5** (CLI and `@deepseek-ai/dsh-acp` 0.2.1-rc.5, ACP SDK 1.4.0)
  installed in a temporary prefix, with a temporary `DSH_HOME` holding a copy of
  the credentials file that was deleted afterwards. It was set through the
  provider command override.
- A real turn ran a Bash `ls -la`, read `notes.txt` and answered with inline and
  display LaTeX. The reasoning and the answer were separate timeline rows in the
  0.14.0 web client.
- **Daemon restart:** after the daemon restarted, the next prompt added only the
  new turn to the timeline (21 to 24 rows, no duplicates), and the agent still
  recalled a value from `notes.txt`.
- **Idle release:** a preload that moved `Date.now` two hours ahead made the 0.14
  idle sweep log "Collected idle agent runtime" for the DSH agent. The next prompt
  logged "Agent resumed from persistence", added only the new turn (24 to 26 rows),
  and the agent recalled the earlier tool result. A real 60-minute idle period was
  not waited out.
- **Not verified:** Windows outside CI, the desktop app and native mobile.

## Beta.16 — bounded v4 history replay (2026-10-29)

- Node **24.14.0**, macOS, a separate checkout; the installed plugins and running
  Paseo daemon were not changed, reloaded or restarted.
- With the **0.13.2** client/plugin/protocol SDKs installed without saving,
  `npm run check` passes: typecheck, lint (0 warnings/errors), **108 tests** in
  five files. With the pinned **0.11.4** SDKs, typecheck and lint pass, and all
  108 tests pass with `vitest run --maxWorkers=1 --testTimeout=15000`. The normal
  two-worker run hit intermittent 5-second timeouts in existing process tests
  on this host; their timeouts and the package scripts were not changed.
- The production provider with the synthetic ACP peer reads a per-session
  `DSH_HOME`. On 0.13.2 it emits user text, separate reasoning and answers, and
  the completed tool card during load. On 0.11.4 the SDK still drops pre-response
  history, an explicitly checked compatibility limit. Bridge tests require replay
  before the matching load response, and unchanged native load, direct resume,
  missing-log and resume-error behavior.
- The fixture is authored synthetic JSONL, compressed into several independent
  Zstandard frames by the tests. Tests cover unknown versions/events/content,
  a newer generation beside v4, malformed JSON, truncated frames, missing files,
  workspace mismatch, path traversal, full tool-output tails and failure status,
  compressed/decoded size limits, record limits and the replay deadline.
- The reader was also exercised read-only on local **DSH 0.2.1-rc.2** v4 logs.
  In a 42-file check, 41 matched the expected text/thought/tool update counts
  (including 10 empty transcripts); one returned empty, with the slowest replay
  around the one-second deadline. This is a bounded fallback, not a guarantee
  that every large or slow log will display. No real conversation fixture,
  credentials or local configuration are included in this repository.
- `npm pack` includes `server/session-replay.ts` and `server/dsh-home.ts`, omits
  tests, and restores the Git manifest afterward. No version bump or release.
- **Not verified in this change:** a live DSH resume, daemon restart, desktop UI,
  Windows or native mobile. The maintainer's isolated Paseo 0.13.2 restart check
  remains the end-to-end acceptance step; the SDK test is not that check.

## Beta.15 — Paseo 0.13.2 registry install and DSH 0.2.1-rc.4 (2026-10-29)

- Isolated Paseo **0.13.2** daemon (CLI 0.13.2 from npm, temporary home, port 6820, relay
  off, `pluginsEnabled` on): `paseo plugin add geoqiao/<slug>` installed all three plugins
  from the registry, status `running` for each. The registry record resolved npm
  `0.1.0-beta.15`.
- DSH 0.2.1-rc.4 installed under /tmp, set through the provider command override with
  its own `DSH_HOME`: provider diagnostic available, status Ready. A real turn ran
  `ls -la` through Bash and read `notes.txt` through Read, and multiplied the marker
  correctly (7193 × 3 = 21579). The web client showed the same tool rows.
- **Not verified:** reload in this run, Windows (CI only), the desktop app and native mobile.

## Beta.15 — zod 4.6.7 (2026-10-28)

- `npm run check`: typecheck, lint and 82 tests pass. `npm audit --omit=dev` reports no
  vulnerabilities; the shipped shrinkwrap pins `zod` 4.6.7.
- Isolated Paseo **0.13.2** daemon (CLI 0.13.2, temporary home, port 6798, relay off): the
  packed tarballs were extracted, production dependencies installed from the shipped
  `npm-shrinkwrap.json`, and all three plugins added from those directories. Status `running` for each.
- Provider diagnostic: available, status Ready. A real turn with the global DSH 0.2.1-rc.3
  ran `cat notes.txt` through the Bash tool and replied with the file's marker. The daemon
  log showed no errors.
- **Not verified:** Windows (CI only), the desktop app and native mobile.

## Beta.14 — registry install and DSH 0.2.1-rc.4 (2026-10-27)

- `@deepseek-ai/dsh-acp`, `dsh-acp-app`, `dsh-agent`, `dsh-sdk-app` and `dsh-base`
  0.2.1-rc.4 differ from rc.3 only in `package.json`; the ACP SDK is still 1.4.0. The
  minimum-version check accepts rc.4 without a code change.
- Isolated Paseo **0.13.2** daemon (temporary home, port 6812, relay off):
  `paseo plugin add geoqiao/deepseek-harness` resolved the registry record to npm
  `paseo-deepseek-harness@0.1.0-beta.14`, status `running`.
  - DSH **0.2.1-rc.4** (npm `next`), installed under `/tmp` with its own `DSH_HOME` and
    selected with the provider command override: provider `available`. A real turn ran
    `ls -la` and read `notes.txt` with tools and answered 4817 × 3 = 14451. After
    `paseo agent reload` the timeline held 0 items, and the agent still answered 4817
    from its DSH context, as documented above.
  - In the 0.13.2 web client (`app-dist` served locally), a second tool turn rendered
    its bash and read rows and the reply; the console showed no plugin errors.
- **Not verified:** Windows, the desktop app and native mobile.

## Beta.14 — Paseo 0.13.2 target and DSH 0.2.1-rc.3 (2026-10-26)

- `npm run check` on Node 24.18.0 with the pinned packages and, in a copy, with the
  **0.13.2** client, plugin and protocol packages installed without saving: typecheck,
  lint with zero warnings/errors and **82 tests / 4 files** each time. The 0.13.0 and 0.13.2 SDK
  packages differ only in `package.json`.
- The packed tarball contains `OVERVIEW.zh-CN.md`; its manifest keeps `translations`
  and drops `build`. Paseo 0.11 and later parse the manifest without `.strict()`, so
  the daemon ignores `translations`.
- Isolated Paseo **0.13.2** daemon (temporary home, port 6815, relay off): the packed
  package, unpacked and installed as a directory with its shrinkwrapped runtime
  dependencies, reached status `running`.
  - DSH **0.2.1-rc.3** at `/opt/homebrew/bin/dsh`: provider `available`. A real turn ran
    `ls -la` and read `notes.txt` with tools and answered 4821 × 3 = 14463. After
    `paseo agent reload` the timeline held 0 items, and the agent still answered 4821
    from its DSH context.
  - `paseo usage` listed the DeepSeek API account as available.
  - In the 0.13.2 web client (the desktop app's `app-dist` served locally), the tool
    rows and reply rendered; the console showed no plugin errors.
  - The daemon keeps the `dsh` path it resolved at startup. When that copy was removed
    during the test, reload failed with the "could not start executable" error until
    the daemon restarted and found the remaining copy. Restart the daemon after moving
    DSH to another path.
- **npm mirror (issue #35), rechecked on 0.13.2:** an isolated daemon whose npm used
  `registry.npmmirror.com` still failed `geoqiao/deepseek-harness` and
  `geoqiao/math-renderer` with `npm artifact changed since review`. The installed
  lockfile had the mirror `resolved` URL and the same `integrity` as the registry
  record. `npm:paseo-math-renderer@0.1.0-beta.6` installed and ran. The comparison in
  `managed-source/npm.ts` is the same in 0.13.2 and on upstream `main`.
- **Not verified:** Windows, the desktop app, native mobile and a registry install of
  beta.14, which is not published yet.

## Beta.13 — Paseo 0.13.0 and DSH 0.2.1-rc.3 (2026-10-26)

- `npm run check` on Node 24.18.0 with the **0.13.0** client, plugin and protocol
  packages installed without saving: typecheck, lint with zero warnings/errors and
  **82 tests / 4 files**.
- **Live, isolated Paseo 0.13.0 daemon on macOS** (temporary home, port 6811, relay
  off): `paseo plugin add geoqiao/deepseek-harness` resolved the registry record to
  npm `paseo-deepseek-harness@0.1.0-beta.13`, status `running`.
  - Global DSH **0.2.0-rc.2**: a real turn ran `ls -la` and read `notes.txt` with
    tools and answered the marker.
  - DSH **0.2.1-rc.3** (npm `next`), installed under `/tmp` and selected with
    `agents.providers.deepseek-harness.command`, with its own `DSH_HOME`: provider
    `available`; `ps` showed that executable with `--profile acp`. A real turn ran
    `ls -la`, read `secret.txt` and answered the codeword. After
    `paseo agent reload` the timeline held 0 items and the agent recalled a number
    from the first turn.
  - In the 0.13.0 web client (`app-dist` served locally), the agent's tool rows and
    replies rendered; the browser console showed no plugin errors.
- **npm mirror (issue #35):** a second isolated 0.13.0 daemon whose npm used
  `registry.npmmirror.com` failed `paseo plugin add geoqiao/deepseek-harness` with
  `npm artifact changed since review`; `geoqiao/math-renderer` failed the same way.
  npm rewrote the lockfile `resolved` URL to the mirror host while `version` and
  `integrity` matched the registry record, and Paseo compares all three. With
  `npm_config_replace_registry_host=never` both `geoqiao/deepseek-harness` and
  `geoqiao/agent-activity` installed and ran. `npm:paseo-deepseek-harness` installed
  and ran with the mirror unchanged. Paseo 0.13.0 has the same comparison as 0.12.0.
- **Not verified:** Windows, the desktop app, native mobile and the Usage panel on
  0.13.0.

## Beta.13 — Paseo 0.11 launch, status and usage (2026-10-18)

- `npm run check` on Node 24.18.0 with SDK **0.11.4**: typecheck, lint with
  zero warnings/errors and **82 tests / 4 files**. The fake peer now receives
  the daemon-style `launch`; new tests cover the registered command, `status()`
  for a good, too-old and missing executable, session variables over the launch
  environment, and the usage source.
- **Live, isolated Paseo 0.12.0-beta.2 daemon on macOS** (temporary home, port
  6799), the worktree installed as a directory, global DSH **0.2.0-rc.2**:
  - `paseo provider ls` showed the provider `available` with three models. A
    real turn read `secret.txt` with a shell tool and answered the codeword;
    `ps` showed `node /opt/homebrew/bin/dsh --profile acp`, the path the daemon
    resolved.
  - `agents.providers.deepseek-harness.command` pointing at a wrapper script in
    a directory with a space: the daemon's availability check, the plugin's
    version probe (`--profile acp --version`) and the ACP process all ran
    through the wrapper, and a real turn completed.
  - The same override pointing at a script that prints `0.1.4`: the provider
    became `unavailable`, and `paseo provider diagnostic deepseek-harness`
    printed the unsupported-version message.
  - `paseo delete` ended both DSH processes. `paseo stop` during a foreground
    `sleep 48` tool call ended the shell and the sleep within three seconds.
    The beta.12 test's surviving `sleep 45` was a background job the tool
    started; DSH lets background jobs outlive the turn.
  - The Usage panel in the hosted web client listed **DeepSeek** with
    `Balance ¥13.26` from the real balance endpoint, using the key in
    `~/.dsh/.credentials.yaml`. `paseo usage --agent` returned nothing for a
    DeepSeek Harness agent: in Paseo 0.12.0-beta.3 only built-in provider
    sessions implement `usageSession()`.
- **DSH 0.2.1-rc.2** (npm `next`), installed under `/tmp` with its own
  `DSH_HOME` set through `agents.providers.deepseek-harness.env`: status
  `Ready` with three models, a real tool turn, and after `paseo agent reload`
  the agent recalled a number from the first turn.
- **Displayed history:** after `paseo agent reload` the timeline held only the
  new turn. Paseo's `hydrateTimelineFromProvider` deletes the stored timeline
  and records the provider's replay; dsh-acp documents `session/resume` as
  restoring the log "without replaying old updates".
- **Packed npm artifact:** `npm pack` gave 13 files and an
  `npm-shrinkwrap.json` that locks `@agentclientprotocol/sdk` 1.4.0, `yaml`
  2.9.1 and `zod` 4.4.3 with integrity hashes. The extracted package, with only
  its runtime dependencies installed, loaded on the 0.12.0-beta.2 daemon, ran a
  real tool turn and returned the balance.
- **Live, isolated Paseo 0.11.4 daemon on macOS** (`@getpaseo/cli@0.11.4` from
  npm, temporary home): the packed package reached `running`, the provider was
  `Ready` with three models, a real tool turn answered the codeword, and after
  `paseo agent reload` the agent recalled a number from the first turn.
  `paseo delete` left no DSH process. The 0.11.4 CLI has no `usage` command;
  the usage source registered without errors in the daemon log, and the balance
  itself was checked only on 0.12.0-beta.2.
- **Without credentials** (empty `DSH_HOME`, no `DEEPSEEK_API_KEY`): status
  `Ready` with one model. The Windows CI job relies on this.
- **Windows CI job** (`deepseek-harness / Windows daemon` in `ci.yml`): runs
  `npm run check`, installs `@getpaseo/cli@0.11.4` and the npm `dsh`
  (`dsh.cmd`), loads the plugin directory in a daemon and requires `Ready` and
  a model list. Its daemon script passed on macOS with the 0.11.4 CLI and DSH
  0.2.1-rc.2. The fake peer now runs as `node fake-dsh.mjs`, which avoids the
  `spawn EFTYPE` failures reported in #27.
- **Not verified:** Windows (the CI job has not run yet), the desktop app and
  native mobile.

## Beta.12 — post-release install check (2026-10-18)

- `paseo plugin add npm:paseo-deepseek-harness@0.1.0-beta.12` on an isolated
  Paseo 0.12.0-beta.2 daemon reached `running`. The provider was available
  with three models; a real turn read a file through a tool and kept the
  reasoning separate from the answer; context survived `paseo agent reload`
  and a daemon restart, and `paseo delete` ended the DSH process.

## Beta.12 — npm shrinkwrap (2026-10-18)

- Registry review getpaseo/plugins#308 held the beta.11 bump because the npm
  package ships no lock for its runtime dependency. The registry entry stayed
  on beta.10.
- On an isolated Paseo 0.12.0-beta.2 daemon (temporary home, relay disabled,
  no client connected), `paseo plugin add geoqiao/deepseek-harness` failed
  with `Invalid plugin provider icon "icon.svg": file does not exist or is not a
  regular file`, as reported in #28. `paseo plugin add
  npm:paseo-deepseek-harness@0.1.0-beta.11` on the same daemon reached
  `running`.
- `npm pack` produces 12 files including `npm-shrinkwrap.json`, which
  contains only the root entry and `@agentclientprotocol/sdk` 1.4.0 with
  `resolved` and `integrity`. In the extracted package,
  `npm ci --omit=dev --ignore-scripts --legacy-peer-deps` installed exactly
  that one package, so the shrinkwrap matches the packed `package.json`. After
  packing, the source tree has no shrinkwrap or pack state left.
- `npm run check` on Node 24.18.0 with SDK 0.9.2: typecheck, lint with zero
  warnings/errors and **75 tests / 3 files**.
- Not verified before release: installing beta.12 through Paseo. Paseo accepts
  only published npm packages, not a local tarball.

## Beta.11 — npm package icon (2026-10-11)

- The install commands were run on an isolated Paseo 0.11.2 daemon (temporary
  home, relay disabled, no client connected). Both npm routes for beta.10,
  `paseo plugin add geoqiao/deepseek-harness` and
  `paseo plugin add paseo-deepseek-harness`, failed with
  `Invalid plugin provider icon "icon.svg": file does not exist or is not a
  regular file`. The beta.10 tarball contains no `icon.svg`; the provider
  registers that icon.
- On the same daemon the `git:` command with tag
  `deepseek-harness-v0.1.0-beta.10` ran the preparation commands and reached
  `running`. The old source without `git:` is rejected as a registry ID.
- Beta.11 adds `icon.svg` to the package `files` list and a test that the
  registered icon is listed there and exists. `npm run check` on Node 24.18.0
  with SDK 0.9.2: typecheck, lint with zero warnings/errors and
  **75 tests / 3 files**.
- `npm pack` produces 11 files including `icon.svg` and `OVERVIEW.md`. The
  extracted package, with its production dependency installed, was added to
  that daemon as a directory: it reached `running`, logged `Plugin ready` and
  `paseo provider ls` listed DeepSeek Harness.
- Not verified before release: installing the published beta.11 from npm or
  through the registry, and a real turn on 0.11.2.

## Paseo 0.11.2 check (2026-10-11)

- No runtime change; the released beta.10 code is unchanged. This check
  accompanies the new `OVERVIEW.md`, its entry in the npm `files` list and the
  install commands for Paseo 0.11.
- `npm run check` on Node 24.18.0 with SDK 0.9.2: typecheck, lint with zero
  warnings/errors and **74 tests / 3 files**. An isolated copy with SDK 0.11.2
  (client, plugin, protocol) installed without saving gives the same result.
- `npm pack --dry-run` lists `OVERVIEW.md` among the 10 packaged files.
- The existing local directory installation reports `running` on a Paseo
  0.11.2 daemon, and its log shows `Plugin ready` with no error output.
- Paseo's registry lists the plugin as `geoqiao/deepseek-harness`, pinned to
  npm `paseo-deepseek-harness@0.1.0-beta.10`.
- Not verified: a real turn, resume or tool call on 0.11.2 for this check. The
  install commands were run afterwards; see the beta.11 section above.

## Beta.8 — minimum-only DSH version check (2026-09-29)

- Beta.7 accepted only six exact DSH releases, so the official `0.2.0-rc.1`
  (npm `next`, published 2026-09-28) was rejected even though nothing in its
  ACP surface changed. The exact list is replaced by a minimum, `0.1.5-rc.1`
  (the oldest tested release), compared with Semantic Versioning 2.0 precedence;
  build metadata is ignored. Only older releases and unparseable `--version`
  output are rejected. No DSH release is known to be incompatible, so none is
  excluded. ACP behaviour was already chosen from the advertised capabilities.
- `npm run check` on Node 24.18.0 with SDK 0.9.2: typecheck, lint with zero
  warnings/errors and **65 tests / 2 files**. New cases accept `0.1.5-rc.3`,
  `0.1.6-alpha.1`, `0.1.7-rc.3`, `0.2.0-rc.1`, `1.0.0-alpha.1` and build
  metadata, reject `0.1.5-rc.0`, `0.1.5-alpha.2`, `0.1.4` and malformed
  versions, and connect the provider to fake `0.1.7-rc.3`/`0.2.0-rc.1` CLIs.
- Official `@deepseek-ai/dsh@0.2.0-rc.1` and a `0.1.7-rc.2` control were
  installed with `--ignore-scripts` in separate prefixes and isolated `HOME`
  directories (no credentials). Both use ACP SDK `1.4.0`. The production
  `createDeepSeekHarnessProvider` returned identical results for both:
  capabilities `prompt.message`, `session.configure`, `session.list`,
  `session.persistence` and `permission`; default model `deepseek-v4-flash`
  among three `deepseek-official` models; thinking `off/low/high/max`; one
  listed session (the empty one catalog discovery creates); clean close and
  dispose with no leftover DSH processes. No prompt or paid inference ran.
- Not verified for 0.2.0-rc.1: real turns, tool calls, resume after restart and
  the signed-in model catalog. The local daemon (Paseo 0.10.1) still uses the
  global DSH 0.1.6-alpha.2 and was not reloaded for this change.

## Beta.7 — Paseo 0.10.0-beta.1 and DSH 0.1.7-rc.2 (2026-09-28)

2026-09-28. Beta.7 pins the public Paseo SDK to **0.9.2**; the same automated
suite also passes against **0.9.0-beta.1** and **0.10.0-beta.1**. The earlier
0.8.0 daemon evidence remains historical evidence. The manifest's
minimum-only `>=0.8.0` range follows Paseo's requirements contract: it admits
0.8.0 and all later releases, including prereleases and future breaking
releases, and is not a compatibility promise for untested versions. An upper
bound is added only if a later release proves incompatible. Beta.7 was loaded on
the local 0.10.0-beta.1 daemon and completed a real turn (see below); no live
0.9.x daemon was tested.

## Upstream evidence

- Paseo `v0.9.2` is commit `c67b7158b441bb09026b38d86ae335cc4b49190a`
  (2026-09-24); `v0.10.0-beta.1` is prerelease commit
  `52d345db7f271251787c1099a2fe48fde515f012` (2026-09-27). The published
  `@getpaseo/plugin` dist, including `server/acp`, `server/provider` and
  `runAcpProvider`, is byte-identical across 0.9.0-beta.1, 0.9.2 and
  0.10.0-beta.1 and still depends on `@agentclientprotocol/sdk` `^1.4.0`. The
  relevant host changes are lifecycle fixes: a provider connection stays
  registered until its close reports, input to a closing connection is
  rejected, a failed plugin provider request no longer crashes the daemon
  (Paseo #5298, #5231), and slash commands for custom ACP providers were fixed
  (#5411). None changes the provider contract. Paseo's plugin reference at
  v0.10.0-beta.1 defines `>=0.8.0` as including prereleases and future
  breaking releases, and recommends an upper bound only for a known
  incompatibility.
- On 2026-09-28 npm reports both `latest` and `next` as DSH `0.1.7-rc.2`
  (published 2026-09-24) and `alpha` as `0.1.7-alpha.2`. The previous tested alpha tarball is
  [`@deepseek-ai/dsh@0.1.6-alpha.2`](https://www.npmjs.com/package/%40deepseek-ai/dsh/v/0.1.6-alpha.2) with integrity
  `sha512-PHR/3ZHpJNWXlDQ3U9weFb7calWbSMJd2GD3z2iPJ8zAKL7ipuzyPy5xGbaXf2OA8hc0SAGJeoUW7nfatCNOYw==`.
- The official DSH tag `dsh-v0.1.6-alpha.2` resolves to commit
  [`ddefc45fbc7f8e46dd73185e68295696d1297887`](https://github.com/deepseek-ai/deepseek-harness/commit/ddefc45fbc7f8e46dd73185e68295696d1297887). Its published CLI closure
  resolves DSH, `dsh-acp-app`, and `dsh-acp` to `0.1.6-alpha.2`, with
  `@agentclientprotocol/sdk` `1.4.0` and matching alpha.2 agent, session, LLM,
  MCP, persistence, token-meter, and approval packages.
- The [official ACP package contract](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/packages/acp/acp/README.md) for both tested closures advertises
  `session/list`, `session/resume`, and `session/close`, omits legacy
  `session/load`, and documents that resume does not replay history. The
  published ACP mappings for rc.2 and alpha.2 retain message IDs on assistant
  and reasoning chunks and typed content blocks on tool results.
- The official tag `dsh-v0.1.7-alpha.2` resolves to commit
  `00102833dfaee1da9f48a3a8eae9d34005a75218`. Its published CLI, ACP app and
  ACP packages resolve to the same alpha.2 line, and the published
  `@deepseek-ai/dsh@0.1.7-alpha.2` tarball has integrity
  `sha512-uXuWobwmpNzqFOTFP61kgf0aH8IzU9LWPF9QWCUfv5DOtgtlm+6+zHvQMboEe0bCaitul61ySvUqd4mMNRedzw==`.
- The official prerelease `dsh-v0.1.7-rc.1` (release ID `394685472`, published
  2026-09-23) resolves to commit
  [`46a7f68b0922371ce7144b668b90e377d8e799f4`](https://github.com/deepseek-ai/deepseek-harness/commit/46a7f68b0922371ce7144b668b90e377d8e799f4).
  The published `@deepseek-ai/dsh@0.1.7-rc.1` tarball has integrity
  `sha512-O1K076aCmqE+h4fB5J+mi3twNSAnh26OqHepaqvS5f1tccFnxhVyGpUmjcncVM5x1SX4niznmvsGrsRo9p733A==`;
  its ACP package has integrity
  `sha512-LPJvNjdoFBFb5QBOyq/UCdMYT/T51Yh7WkzbM7hdwqGQK8PVoaqNmRbvPCBQqUeO+HufhQ05vwwBAXoa0feDRA==`.
  The alpha.2-to-rc.1 source comparison changes the ACP package and bundle
  package versions; the ACP implementation files remain unchanged.
- The official prerelease `dsh-v0.1.7-rc.2` (release ID `395756051`, published
  2026-09-24) resolves to commit
  [`477b4f420553e8a52c2fbccc464d7561b239c443`](https://github.com/deepseek-ai/deepseek-harness/commit/477b4f420553e8a52c2fbccc464d7561b239c443).
  Locally recomputed tarball integrities match the registry:
  `@deepseek-ai/dsh@0.1.7-rc.2`
  `sha512-SQFhriLvza8GnFApnC5/32AgpcyKxrWnYXhvwDOLJdgWpkCX2EexyR9c8kCkMITJXnFLEN3Qb2CEh0W36vkLyw==`;
  `@deepseek-ai/dsh-acp@0.1.7-rc.2`
  `sha512-pYA/KH4ks/q/S82PEwdpGQ+Bdmyx8G4aspd2N0BVM9KAfupEszrgZyfNX7L0+hvy4sYTjP5LyUr6/2QmQVhXiw==`;
  `@deepseek-ai/dsh-acp-app@0.1.7-rc.2`
  `sha512-7Km0Fchvx/PoL3/By4M6ykKkrmmIgelXq/1l0624Ixt3JgTtFNSgko3dpL/32Hv/a5Fn/wEsuujBHzmcBBcZ7Q==`.
  The ACP package's `lib/` is byte-identical to rc.1 (only `README.i18n.yaml`
  and the version differ) and still uses `@agentclientprotocol/sdk` `1.4.0`.
  The CLI closure did change: it adds `@deepseek-ai/dsh-experimental-auto-review`
  (512 to 520 installed packages), reports skipped bundles on stderr at
  startup, changes code in runtime packages including `dsh-llm`,
  `dsh-agent-loop`, `dsh-session`, `dsh-user-approval` and tools, and makes
  `dsh-base` load `dsh-llm-deepseek-api-key` in the DeepSeek LLM slot (provider
  ID still `deepseek-official`) plus an `llm-deepseek-account` route whose
  catalog is empty when signed out.
- The 0.1.7 ACP implementation fixes tool-result projection to use the complete
  message content and identity. Its public initialize response retains ACP v1,
  `session/list`, `session/resume`, and `session/close`.

## Layers of evidence

The beta.1 baseline below had 19 automated cases. The separate
[beta.2 code review](code-review.md) passes typecheck/lint and **32 tests** after
diagnostic fixes and missing-coverage additions. Its new failures use synthetic
processes/strings; the real-inference evidence below was established in beta.1,
not silently reclassified as a fresh beta.2 API or native-client run.

| Layer | Evidence |
| --- | --- |
| Public SDK + fake ACP process | For beta.7 on Node 24.18.0, `npm run check` passed: typecheck, lint with zero warnings/errors, **32 tests / 2 files** against the pinned exact Paseo SDK `0.9.2`, and again with the SDK swapped to exact `0.9.0-beta.1` and `0.10.0-beta.1`. Node 22 was not available locally for beta.7; earlier releases passed on Node 22.23.2 and 24.21.0 against `0.9.0-beta.1`. Catalog/model/thinking IDs, config changes, multiple turns, persistence, complete output, MCP/image frames, allow/deny permissions, cancellation/errors/EOF, concurrent cwd/env isolation and closure during version probe/initialize/prompt are covered. |
| Real ACP control surface | The published rc.2 and alpha.2 CLIs each passed an initialize probe reporting ACP v1, `session/list`, `session/resume`, `session/close`, HTTP MCP, and no `loadSession`; each created and closed a temporary session. |
| Official runtime + public provider factory | On Node 22.23.2, isolated CLI `0.1.5-rc.2` with ACP `0.1.5-rc.2` and global CLI `0.1.6-alpha.2` with ACP `0.1.6-alpha.2` each passed catalog discovery, session open/configuration, one bounded synthetic no-tools prompt with the exact marker `SYNTHETIC_DSH_PASEO_CHECK`, usage/timeline events validated by `ProviderEventSchema`, and clean close. No permission event occurred. |
| New official alpha control surface + public provider factory | An isolated published CLI/ACP `0.1.7-alpha.2` closure reported the exact version and passed ACP initialize with `session/list`, `session/resume`, and `session/close`. The production `createDeepSeekHarnessProvider` completed initialize, capability mapping and clean connection/provider close through Paseo's public `runAcpProvider` shim. No model prompt, tool execution, approval, credential or paid inference was attempted. |
| New official rc control surface + public provider factory | An isolated published CLI/ACP `0.1.7-rc.1` closure reported the exact version, passed ACP initialize with `session/list`, `session/resume`, and `session/close`, and returned an empty result from `session/list`. After the exact guard was updated, the production `createDeepSeekHarnessProvider` completed initialize, capability mapping and clean connection/provider close through Paseo's public `runAcpProvider` shim. No model prompt, tool execution, approval, credential or paid inference was attempted. |
| New official rc.2 control surface + public provider factory | On Node 24.18.0, an isolated published CLI/ACP `0.1.7-rc.2` closure printed exactly `0.1.7-rc.2` for `dsh --version` and passed ACP initialize (protocol 1) with `session/list`, `session/resume`, `session/close` and no `loadSession`. `session/list` returned no sessions; `session/new` returned three `deepseek-official` models with reasoning effort off/low/high/max (default high); `session/close` returned `{}`; resume succeeded in the same and in a fresh process. The normalised output matched the same probe on rc.1. The unmodified beta.6 guard rejected rc.2 with its exact-version error. With rc.2 added to the guard, the production `createDeepSeekHarnessProvider` connected through Paseo's public `runAcpProvider` shim with capabilities `prompt.message`, `session.configure`, `session.list`, `session.persistence` and `permission`, returned an empty session list and a three-model catalog (default `deepseek-v4-flash`/high), and closed and disposed with no leftover processes; an rc.1 control run was identical. No model prompt, tool execution, approval, credential or paid inference was attempted. The signed-in account catalog, Node 22 and package install scripts were not exercised. |
| Latest alpha persistence and tool regression | On Node 24.21.0 with global `@deepseek-ai/dsh@0.1.6-alpha.2`, a temporary wrapper recorded **6/6** owned ACP profile children closed across provider disposal. A first no-tools prompt stored a unique marker; a second provider reopened the returned persistence, the wrapper observed `session/resume` and no `session/load`, and a second prompt recalled the marker without including it. A temporary `read-probe.txt` read-tool prompt returned the synthetic file marker through a typed `tool_call` raw-output detail; no permission event or approval response was involved. |
| Historical official runtime + production provider factory | CLI `0.1.5-rc.1` and `0.1.5-rc.2`, each with ACP package `0.1.5-rc.2` and ACP SDK `1.4.0`. Three real DeepSeek v4-flash/reasoning-off turns per version passed: memory, file write/read, complete >8,000-character tool-output tail, and native context after provider/child restart. All emitted events passed `ProviderEventSchema`; usage events arrived. |
| Local CLI upgrade | The authorized global installation moved from `@deepseek-ai/dsh` `0.1.5-rc.2` to `0.1.6-alpha.2`. `$HOME/.dsh/.credentials.yaml` remained owner-only (`0600`) with unchanged metadata; its contents were never read or logged. The `0.1.7-alpha.2`, `0.1.7-rc.1` and `0.1.7-rc.2` checks remained isolated and did not alter the global CLI. |
| Historical actual macOS Paseo daemon | Installed server entry and provider discovery succeeded. Two real turns retained context and a 101-line tool result. After disabling/enabling only this plugin, a third turn recalled the same marker and filename, and Paseo retained earlier displayed messages. No credential was passed in the Paseo agent configuration. |
| Real managed-child cleanup | An official DSH foreground shell tool launched a synthetic Node process that ignored SIGTERM. After closing the production provider, that owned child was gone. This is a targeted check, not a guarantee for arbitrary independently detached services. |
| Client UI | No custom client entry. Desktop UI matrix, native iOS/Android, vision requests and real MCP services are untested. Fake image/MCP frame tests are not live service or device tests. |

The 0.8.0 daemon and earlier 0.1.5-rc.1/rc.2 inference rows are retained from
previous beta evidence. The installed desktop daemon auto-updated to
0.10.0-beta.1 on 2026-09-28 and rejected beta.6 under its old `<0.10.0` range.
Beta.7 at PR head `1f44a52` was then reloaded into the existing enabled
`deepseek-harness` directory installation, without a daemon restart or
enable-state change, and reports running. One real deepseek-v4-flash,
thinking-off turn ran a single Bash tool call and returned its reply; the hosted
web client (app.paseo.sh, via relay) displayed both, and the test agent was
archived. The global `dsh` reports 0.1.6-alpha.2; 0.1.7-rc.2 was verified only
in the isolated checks above.

Real tests used only synthetic markers and temporary files. Personal conversations,
credentials and raw private fixtures are not included in this repository. API calls
are paid and are not part of CI.

## Shutdown regression and fix

The first actual disable/enable run exposed `ERR_IPC_CHANNEL_CLOSED` in Paseo
0.8's plugin-process shutdown. Its close handler removes a connection from the
host map before awaiting its asynchronous close; concurrent shutdown can then
disconnect IPC before the final close acknowledgement. Session restoration still
passed, but an exit error is not considered clean teardown.

The adapter now owns pending connects, scopes, resources and closing promises
through `dispose()` in its async entry cleanup. It marks all scopes closed before
any await and retains already-closing connections until their close settles.
Three added public-SDK/fake-peer regressions passed for pending version probing,
pending initialization and host-close acknowledgement ordering.

After loading the fix, the installed macOS daemon's disable/enable cycle was
repeated while DSH sessions were idle or closed. The new log interval contained
only stopping/stopped/loading/ready entries, with no IPC error or stderr. Another
real model turn restored the same marker and filename, and retained the earlier
Paseo history. All installed plugins' enable/status values were unchanged after
the cycle. The existing daemon was not restarted.

No host internals are imported or patched, and no global IPC/error handler is used
to hide the failure. Older log entries from the pre-fix runtime remain historical
evidence, not new failures. These targeted checks do not prove every possible
host shutdown or external detached-process scenario.

## Deliberate limitations and side effects

- DSH's ACP profile emits committed messages/thoughts and generic tool events,
  not raw token deltas, slash commands, steering, plans or terminal UI surfaces.
- A translated resume can replay recognised v4 text history on Paseo 0.13+.
  Unsupported, missing, corrupt or over-limit logs retain context-only resume.
  Failed resume is never retried as a fresh session.
- Catalog discovery uses `session/new`; official DSH can retain those empty
  sessions. The plugin does not delete native records; replay reads only the requested
  session transcript under its resolved `DSH_HOME`.
- DSH profile settings stay authoritative. The generic ACP shim does not inject
  Paseo's extra system prompt. Custom profiles must still provide ACP over stdio.
- The CLI version guard is minimum-only (`0.1.5-rc.1`). Newer releases load
  without being tested; it does not pin the CLI's transitive packages or
  certify future dependency closures.
  DSH itself is a rapidly changing developer preview.
- Complete output is intentionally retained. Large payload transfer, storage,
  Raw and copying can be expensive. An optional renderer may bound display work;
  this adapter never drops the original body to make a preview faster.
- Plugins, official DSH and its tools run as trusted, unsandboxed code. Credentials
  stored with mode 0600 remain readable to tools running as the same OS user.

## Dependency review

On 2026-09-28 `npm audit --omit=dev` reported zero advisories for the
adapter's production dependencies. Against the isolated official CLI
lockfiles, `0.1.7-rc.1` and `0.1.7-rc.2` each report 8 moderate findings that
trace to one advisory: `@deepseek-ai/libreoffice-kit` `0.1.2` pins a nested
`fflate` `0.8.2`
([GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98),
an infinite loop on malformed ZIP64 archives), and the remaining findings are
the DSH office/web/SDK packages that depend on it. This is in DSH's own
dependency tree, is unchanged from rc.1, and the plugin neither installs nor
updates DSH. An earlier zero-advisory check covered the `0.1.5-rc.2` CLI tree
only. These are point-in-time package-advisory checks, not a security
certification. Official DSH's safety notice and the user's tool permission policy
still apply.
