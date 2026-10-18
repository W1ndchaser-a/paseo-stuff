# Verification and remaining gaps

## Beta.11 — npm package (2026-10-18)

- `npm run check` on Node **24.18.0** with the pinned SDK **0.9.2**: typecheck, lint
  with no warnings/errors, **8 files / 275 tests**. The same tree with SDK **0.11.4**
  (client, plugin, protocol) installed without saving gives the same result.
- `npm pack` produced the package; `postpack` restored the source manifests. The
  packed `paseo-plugin.json` has no `build`, and `npm-shrinkwrap.json` contains only
  `prism-react-renderer`, `@getpaseo/protocol` and their dependencies.
- Isolated Paseo **0.12.0-beta.3** daemon (temporary home, port 6801). Its npm used a
  local Verdaccio registry holding the tarball; other packages were proxied from npmjs.
  Verdaccio omits the `_hasShrinkwrap` flag that npmjs sets on packages with a
  shrinkwrap, so the test set that flag in Verdaccio's storage to match npmjs.
  - `paseo plugin add npm:paseo-readable-agent-activity@0.1.0-beta.11` installed the package: status `running`, no error.
    npm placed the dependencies under the package's own `node_modules` at the
    shrinkwrapped versions. Without the flag, npm ignored the shrinkwrap and resolved
    newer versions.
  - The unpacked tarball, after `npm ci --omit=dev --ignore-scripts`, installed as a
    directory: status `running`, no error.
  - A `.tgz` path, `npm:<path>` and `npm:file:<path>` are rejected as sources, as
    the Paseo source reference states.
- In the **0.12.0-beta.3** web client (`app-dist` served locally) on that daemon, a
  DeepSeek Harness turn ran `ls -la` and read `notes.txt`. The collapsed cards showed
  `bash ls -la` and `read notes.txt`; expanding `bash` showed the highlighted JSON
  Input and the real Output. The browser console showed no plugin errors or warnings.
- **Not verified:** installation from the public npm registry (the package is not
  published yet), the desktop app, native iOS/Android and Summary.

## Beta.10 — header argument (2026-10-18)

- `npm run check` on Node **24.18.0** with the pinned SDK **0.9.2**: typecheck, lint
  with no warnings/errors, **8 files / 275 tests**. The same tree with SDK **0.11.4**
  (client, plugin, protocol) installed without saving gives the same result.
- **Live 0.12.0-beta.2 check:** the branch checkout was installed as a directory on an
  isolated daemon (temporary home, port 6799) next to `paseo-deepseek-harness@0.1.0-beta.12`
  from npm. Client: hosted web app (app.paseo.sh) in a fresh Chromium profile, paired
  through the relay. A real DeepSeek Harness turn ran `ls -la src`, read `src/a.ts` and
  searched `src`. The collapsed cards showed `bash ls -la src`, `read <absolute path>`
  and `grep <absolute path>`; expanding `bash` showed the JSON Input and the real
  Output. At 390×844 dark, a running two-line command showed only its first line,
  cut with `…`, next to the running indicator, and kept the tool name visible after
  completion. Reloading the plugin from `main` removed the arguments from the same
  history; reloading the branch restored them.
- **Not verified:** the Paseo desktop app, native iOS/Android, Summary and a 0.11.x
  daemon.

## Paseo 0.11.2 check (2026-10-11)

- No runtime change; the released beta.9 code is unchanged. This check accompanies the
  new `OVERVIEW.md` and the install commands for Paseo 0.11.
- `npm run check` on Node **24.18.0** with the pinned SDK **0.9.2**: typecheck, lint
  with no warnings/errors, **8 files / 253 tests**. An isolated copy with SDK **0.11.2**
  (client, plugin, protocol) installed without saving gives the same result.
- Paseo's registry lists the plugin as `geoqiao/agent-activity`, pinned to commit
  `abc4d96` (tag `readable-agent-activity-v0.1.0-beta.9`).
- Install commands, run on an isolated Paseo 0.11.2 daemon (temporary home, relay
  disabled, no client connected): `paseo plugin add geoqiao/agent-activity` installed
  commit `abc4d96` and the `git:` command with tag `readable-agent-activity-v0.1.0-beta.9`
  installed the same commit; both ran the preparation commands and reached `running`.
  The old source without `git:` is rejected there as a registry ID.
- **Not verified:** any 0.11 client, so the client bundle was compiled by the daemon
  but not evaluated in an app. The local `colorful-agent-activity` installation stayed
  disabled and was not reloaded.

## Beta.9 — manual native-row switch (2026-09-29)

- Feature: two global Command Center actions switch this client between Activity tool
  cards and native tool rows, so Summary can group native rows. See
  [compatibility](compatibility.md#manual-native-row-switch-beta9).
- `npm run check` on Node **24.18.0** with the pinned SDK **0.9.2**: typecheck, lint
  with no warnings/errors, **8 files / 253 tests**. The same tree with SDK **0.10.1**
  (client, plugin, protocol) installed without saving gives the same result.
- Hermes and DOM-free bundle evaluation (not skipped) cover the default card mode,
  repeated commands without duplicate transformers, native rows removing only the tool
  transformer while Thinking stays, restoring cards, and complete reverse-order cleanup.
- Unmodified 0.9.2 `presentation.ts`: one presentation instance renders history as
  ungrouped cards in Summary, regroups both calls after the switch to native rows
  (Thinking still transformed) and returns to ungrouped cards after switching back.
- **Live 0.10.1 check:** PR head `ad59967` was loaded into the existing disabled
  `colorful-agent-activity` directory installation, enabled for the check and disabled
  again afterwards; the checkout returned to `main`. Client: hosted web app
  (app.paseo.sh) in a fresh desktop Chromium profile, paired through the relay, on an
  existing Pi conversation. With Summary selected and cards active, four consecutive
  `exec` calls stayed as four ungrouped cards. After **Activity: use native tool rows
  (for Summary)**, the history immediately showed native groups ("Used 4 other tools",
  "Searched 1 time and used 1 other tool") while Thinking rows stayed. After
  **Activity: use tool cards (Full detail)**, the cards returned and one expanded with
  Output and Show all.
- **Not verified:** the Paseo desktop app, streaming during a switch, mobile, and
  0.8 re-rendering after a switch.

## Beta.8 — Paseo 0.9.2 / 0.10.0-beta.1 compatibility (2026-09-28)

- Trigger: the local desktop daemon auto-updated to **0.10.0-beta.1** and rejected
  beta.7 (`requires Paseo >=0.8.0 <0.10.0. Your daemon is 0.10.0-beta.1`). The
  manifest now declares only `>=0.8.0`; see [compatibility](compatibility.md).
- `npm run check` on Node **24.18.0** with the pinned SDK **0.9.2**: typecheck, lint
  with no warnings/errors, **8 files / 252 tests**, including actual Hermes evaluation.
  The same tree with SDK **0.10.0-beta.1** installed without saving gives the same
  result. An isolated matrix of the unchanged beta.7 tree also passed with SDK
  0.9.0-beta.1, 0.9.2 and 0.10.0-beta.1. Node 22 was not run locally; CI covers 22 and 24.
- `@getpaseo/plugin` dist is byte-identical in 0.9.0-beta.1, 0.9.2 and 0.10.0-beta.1.
  Protocol 0.9.0-beta.1 to 0.9.2 only adds an optional timeline search `count`; client
  and protocol 0.9.2 to 0.10.0-beta.1 only add daemon password authentication and hello rejection.
  `protocol/agent-types` and tool-name normalization are unchanged. The host app's
  React, React Native, Expo, Zod, React Query and Lucide ranges are identical in all three tags.
- Two 0.9 fixtures were replaced with unmodified v0.9.2 source (`agent-stream/presentation.ts`,
  `utils/split-markdown-blocks.ts`); the other five were already identical. All seven
  match v0.10.0-beta.1. The nine 0.9 host tests pass unchanged; only the suite label
  now names 0.9.2. The 0.8 fixtures and their tests are unchanged.
- Lockfile changes are limited to the four `@getpaseo` development packages and their
  transitive `ws` (8.21.3 to 8.22.0). No runtime dependency is added.
- Summary remains unsupported: grouping code and the public transform input are unchanged.
- **Live 0.10.0-beta.1 check:** beta.8 at PR head `1f44a52` was reloaded into the existing
  enabled directory installation `colorful-agent-activity` on the local macOS daemon,
  which reports it running; Pet stayed disabled. The client was the hosted web app
  (app.paseo.sh) in desktop Chromium at 1280×720, paired through the relay, with Full
  detail. A real DeepSeek Harness turn's Bash call rendered as an Activity card.
  Expanding it showed syntax-highlighted JSON Input and the `paseo-plugin-check` Output;
  collapsing restored the header. Light and dark schemes both rendered.
- **Not verified:** the Paseo desktop app, any live 0.9.2 daemon, Summary, narrow layouts,
  streaming in a live UI (the turn had finished before viewing) and native iOS/Android.
  Spacing was not measured. These prerelease checks are not stable 0.10 acceptance.

The sections below record historical checks for earlier releases.

## Beta.7 — Paseo 0.9 migration (2026-09-18)

- `npm run check` passed on Node **22.23.2** and **24**: typecheck, lint with no
  warnings/errors, **8 files / 252 tests**, including actual Hermes evaluation.
- Unmodified 0.9.0-beta.1 host fixtures add nine tests covering the new presentation
  order, native plans/speech, full reasoning text, status fidelity and stable source
  identity. Four unit cases cover native plans in every lifecycle status. Existing
  0.8 tests remain. Fixture provenance and Apache license are recorded alongside them.
- `colorful-agent-activity` reloaded on `127.0.0.1:6767` and reports enabled/running
  on the 0.9.0-beta.1 daemon. A bounded synthetic Pi turn emitted one tool call and
  two formulas; its completed timeline was inspected and its test agent archived.
- Desktop UI automation was unavailable in this session. The live turn does not
  establish visual acceptance of its cards. No native mobile UI check was performed.
- Summary remains unsupported: 0.9 preserves all custom cards but bypasses native
  grouping. No host preference was changed. DSH and Pet enable states were preserved.

## Beta.6 — unified formatter and local acceptance (2026-09-13)

This section supersedes earlier beta UI/feature descriptions below; those sections
remain as historical release evidence, not claims about the current renderer.

- Plugin-local `npm run check`: typecheck, zero lint warnings/errors, **7 files / 239
  tests**, all passing. The reduced count reflects removal of old Markdown reasoning, summary,
  diff, UI-text rewriting and old two-path renderer tests; current behavior has new
  formatter, completeness, native-detail and renderer regressions.
- DOM-free Node and real RN 0.81.5 Hermes bundle evaluation both ran (not skipped).
  They verify four timeline-only registrations (tool and minimal Thinking transformers/renderers),
  cleanup, complete formatted output, exact thought text, twenty-line preview and syntax tokenization.
- Real pinned Paseo 0.8 projection functions verify stable source identity, exact thought
  text/phase, native messages/speak fallback and Full detail. The Summary test still explicitly
  reproduces the host API gap; it is not a claim of Summary support.
- Production React Native components in the isolated browser harness passed at
  **1500×1050 dark** and **390×844 light**: JSON key/string/literal colors, exactly
  twenty formatted logical lines, one Show all, full-tail retention, normal text
  selection with exact newlines, streaming/manual disclosure and no compact overflow.
  A 100,000-line text result initially exposes only twenty lines. All **62** existing
  Paseo icon mappings render real SVGs. No browser warnings/errors occurred.
- The latest spacing correction uses native-default **14px text, natural leading
  and 12px icons** on both layouts. The additional 44px compact header minimum is
  removed. At **1400×950 dark/light** and **390×844 light**, the source-adapted browser
  comparison measures all seven plugin pitches at **33px**, versus **32px for an
  all-native tool/Thinking sequence**. Both columns' computed font size and leading
  match. This is no longer a mixed native/plugin baseline. Default natural plugin
  headers measure 17px; their hit areas are smaller than native badges, not 44px.
- The spacing correction passed 231 tests. The spacing suite checks first/footer
  boundaries, keyboard disclosure, full text, streaming and expanded-content flow.
  The standalone compact Show all target remains at least 44px. A browser-only 28px
  font-size probe makes headers grow without clipping; it is not an iOS Dynamic Type
  test. The full formatter suite passes again with zero console warnings/errors.
  Updated light desktop/compact screenshots were inspected. The user then accepted
  the revised UI. Independent phone geometry, font-scaling and touch-matrix testing
  are still not established.
- The subsequent preview bug was reproduced at 390×844: a long JSON string had only
  three formatted source lines, expanded to a **63,530px card** and offered no Show all.
  The fix retains source-line prefixing but clips wrapped content to **380px** for
  code/JSON/plain text (20×19px) and **400px** for Thinking (20×20px), scaled with font
  size. The same compact card now measures **582px** including both labeled sections
  and its one Show all control. These are browser measurements, not phone measurements.
- Eight new mocked renderer regressions cover measured overflow, the exact threshold,
  independent Input/Output measurements, width changes, empty output, system font scale,
  Thinking and manual full state. The dedicated wide/compact browser suite verifies
  long JSON/plain/Unicode input, full-text fidelity, streaming/reopening, Show less,
  automatic removal of an unnecessary button after widening, and ancestor wheel scroll.
  Native preview scrolling is disabled; the web clip preserves ancestor gestures.
  The formatter and native-spacing browser suites still pass with zero console
  warnings/errors. The compact clipping screenshot was inspected. Native iOS/Android
  gesture behavior and scaled font metrics for this change remain unverified.
- Superseded trials used 13px text, 32px then 30px desktop pitch, and retained
  44px compact headers / 60px pitch. Their passing geometry tests did not establish
  native visual compatibility. User desktop/mobile screenshots rejected that design;
  the latest comparison now uses native typography and a fully native reference.
- Two read-only reviews confirmed the native-Thought/public-API spacing boundary;
  the previous density adapter had no concrete blocker in its implementation review.
  Those reviews predate the new typography/mobile-target correction and did not
  establish native-device measurements or acceptance of its visual design.
- Synthetic dark/light screenshots were pixel-inspected and kept in ignored local
  scratch storage, not substituted for published beta screenshots.
- JSON keys now use host foreground, not accent: the default host uses the same dark
  green accent in both themes, unsuitable for small dark-theme text. Strings and
  number/boolean/null values use exposed success/warning colors. Other grammars keep
  their existing palette behavior.
- The initial formatter pass left the existing local installation disabled. For the
  later spacing request, `colorful-agent-activity` on `127.0.0.1:6767` was found enabled.
  After checks it was reloaded at **2026-09-13T09:34:38Z**, returning running/ready with
  no new stderr. Other plugin enable states were unchanged; no duplicate installation,
  daemon restart or host preference change. Desktop accessibility exposes Thinking
  controls after reload; the numeric spacing measurements above are from the browser
  reproduction, not a pixel measurement of the live app. The user later accepted the
  corrected collapsed-row UI.
- The superseded 14px-header refinement was reloaded into the same enabled alias at
  **2026-09-13T10:05:00Z**. It returned running/ready; plugin log entries 39–42 contain
  only stopping/stopped/loading/ready. Other plugin enable states remain unchanged.
  The temporary browser and preview server were closed after verification.
- The native-font/mobile-density correction reloaded that alias at
  **2026-09-13T10:19:46Z**, returning running/ready. Plugin log entries 43–46 contain
  only stopping/stopped/loading/ready; other plugin states are unchanged. Desktop AX
  still exposes Thinking buttons, but inspected bounds were clipped/offscreen and
  do not establish live pixel spacing. This trial's browser and preview server were
  closed; no subagents, workspaces or worktrees were created.
- The wrapped-preview fix reloaded the same enabled alias at
  **2026-09-13T10:41:52Z**, returning running/ready. Plugin log entries 55–58 contain
  only stopping/stopped/loading/ready, and other plugin states are unchanged. The
  browser and preview server created for this regression check were closed. No
  subagents, workspaces or worktrees were created for this fix.
- The user accepted the local UI and preview fix, then authorized the beta.6 release.
  Package and lockfile are versioned together. The unused `diff` and `@types/diff`
  direct dependencies were removed using the plugin's own npm lockfile.
- Three README comparison screenshots were captured from identical synthetic inputs
  using the production Activity components and the source-adapted native reference.
  All 20 vendored development reference files passed SHA-256 verification. Pixel
  dimensions were checked and the screenshots inspected; no personal fixtures or
  generated artwork are included. Old images were removed from the current release
  so Cafe's directory scan cannot pick the previous UI. See [provenance](screenshots.md).

Native iOS/Android UI, real device clipboard, a full reconnect/virtualization matrix
and a latency benchmark remain unverified. Browser selection and mocked compact props
are not native-device coverage. Source serialization, very long individual lines
and Show all remain potentially expensive; formatter/highlight limits fall back to
intact text rather than silently dropping data. See the [current contract](conversion-compatibility.md).

## Beta.5 native-loading follow-up

Typecheck and lint pass (zero warnings/errors), with **14 files / 251 tests** passing.
The new bundle test ran, not skipped, using the Hermes executable shipped with the
plugin's `react-native@0.81.5` dependency. It covers the full entry's registration and
cleanup, then actual highlighting for 13 language IDs with Unicode, CRLF, blank lines
and trailing newlines. The same bundle also passes a DOM-free Node VM evaluation.
Additional unit cases cover aliases, partial JSON, limits, grammar failure/retry and
theme colors. This is real JS-engine coverage, not native UI or clipboard integration.
On systems without that executable the Hermes case is explicitly skipped; supply
`HERMES_BIN` to run it with an installed matching engine.

The existing browser UI suite passed again at **1500×950 dark / 390×844 light**, including
highlighting, full Readable/Raw copying, streaming/manual disclosure, large previews,
keyboard and overflow checks, with zero browser warnings/errors. Temporary screenshots
were kept outside the repository; published screenshots were not replaced.
The installed macOS client still exposed Activity's Expand Exec/Thinking controls after
reload. No new on-phone visual check is claimed.

The existing enabled `colorful-agent-activity` installation on `127.0.0.1:6767` reloaded
successfully and reported running, with only stopping/stopped/loading/ready log additions.
The daemon was not restarted; `deepseek-harness` and `paseo-pet` remained disabled.
The temporary browser and preview process were closed. That verification pass did
not publish a release; the fix is now included in the monorepo beta.5.
The dependency audit still reports only the previously documented low-severity `diff` advisory.

## Automated checks

The published v0.1.0-beta.1 baseline had typecheck and lint passing with **13 files / 187 tests**.
The v0.1.0-beta.2 formatter follow-up passes the same checks with **13 files / 202 tests**.
It was reloaded into the existing enabled macOS Paseo 0.8.0 installation, which reported running.
No daemon restart, host display-preference change or other plugin state change was performed.
CI runs the same checks on Node.js 22 and 24.

The separate v0.1.0-beta.3 code review passes typecheck, zero lint issues and
**13 files / 217 tests**. Obsolete tests for unreachable output parsers were removed;
active-path regressions were added instead. In an isolated before-fix checkout,
the initial 213-case review suite produced **14 failures / 199 passes** against
beta.2 runtime code. A further two renderer cases reproduced repeated Raw
serialization and now pass; the final suite also covers 100,000-line diff counts.
The independent review's whitespace-stripped blank-context case also failed
before its one-condition fix and passes now.
See [code-review.md](code-review.md).

The v0.1.0-beta.4 icon fix passes typecheck, zero lint issues and **13 files / 224 tests**.
All seven new cases failed against the previous icon mapping, then passed after replacing
`ListActivity` with `Activity`. The suite validates every entry in the 62-tool Paseo map,
four supported tool-name spellings, and renderer size/color and manual disclosure across updates.
The pinned test-only `lucide-react@0.546.0` supplies the web icon exports for the same Lucide
release as Paseo 0.8.0's locked `lucide-react-native@0.546.0`; it is never imported by production.
Host source evidence: [named-export lookup](https://github.com/getpaseo/paseo/blob/b8e24677e12b226c7c38c1c3a40649daa9f1152f/packages/app/src/plugins/icons.ts)
and [dependency lock](https://github.com/getpaseo/paseo/blob/b8e24677e12b226c7c38c1c3a40649daa9f1152f/package-lock.json).
This checks catalog compatibility, not native SVG rendering.

Coverage includes:
- Lexical JSON fidelity, empty/malformed/oversized payloads, generated-output bounds and surrogate boundaries.
- Explicit code inputs, typed result envelopes, non-text placeholders and full Raw data.
- DSH-projected ACP `content[]` wrappers: explicit `type: "content"` blocks with nested text are extracted one layer, while mixed non-text blocks remain safe placeholders and the source stays in Raw.
- Explicit Pi Code-mode envelopes: one-layer `exec_command` result extraction only when `details.codeMode === true`, with schema rejection for partial/ambiguous wrappers.
- Mixed result blocks with per-segment language, one aggregate preview budget, multiple results and preserved unknown/image placeholders, including the ACP projection.
- Nested exit codes, running sessions, empty output, script errors, dropped trace counts, upstream `[Output truncated]` markers and formatter-limit notices.
- Exactly one decoding layer for known UI labels; generic logs/code and malformed quotes remain literal.
- Repeated AX role paths compacted only in the derived UI view; full labeled paths retained in Raw.
- JSON text-block highlighting, short headers and real-shaped custom tool inputs.
- Default collapse, user-controlled Show all/Show less, streaming/status updates and complete selected-view copying.
- Async clipboard races, error feedback, dark/light colors and compact props.
- Unmodified pinned Paseo projection functions, including the intentionally unsupported Summary grouping case.

The new Activity cases use synthetic envelopes only. They deliberately do not inspect or serialize
trace/image payloads for the default preview, do not repair partial JSON, and verify that Readable,
Raw and complete selected-view Copy remain distinct.

## Browser and host checks

The development workspace also has a separate React Native Web comparison harness. Its browser checks passed at **1500×950 dark** and **390×844 light**, exercising production components with synthetic inputs: frame spacing, keyboard disclosure, wrapping, code/JSON, quoted UI labels, Raw/Copy, streaming, bounded previews and 100,000-row data.

The standalone release includes source/unit/renderer/host-projection tests and selected synthetic screenshots, not the separate comparison application's source or its large host renderer fixtures. The browser check is not a connected-host integration test.
The baseline browser suite was repeated for beta.2. A new **1500×1050 / 390×844** browser pass
also verified nested Pi output, literal escapes, one-layer ACP blocks, mixed JSON token colors,
full Readable/Raw copying, streaming, compact status spacing and absence of horizontal page overflow.
The first pass exposed oversized newline-only status boxes; those were fixed and the check rerun.

For beta.3, both preceding browser suites passed again. A separate `?review` pass
at **1500×1050 dark / 390×844 light** verified hunk-aware diff colors/counts,
complete unified/before/after Raw copying, read offset zero, lone-surrogate preview
boundaries, streaming and preservation of Raw choice through layout/theme updates.
The repeated output screenshot was byte-identical; no preview artwork was changed.
These are synthetic production-component checks, not a new native-client matrix.
After typecheck, beta.3 was reloaded into the same enabled macOS Paseo 0.8.0
installation. Its new log entries were only stopping/stopped/loading/ready,
with no new stderr. The DSH and pet installations retained enabled/running state;
the daemon and display preferences were not changed.

For beta.4, a focused `?icons` browser pass at **1500×1050 dark / 390×844 light**
verified all 62 headers contain a drawn 14px Lucide SVG, including the valid `Globe2` alias,
and the Activity glyph survives expansion and streaming. The preview now resolves named
exports like the host and uses the matching Lucide release; it no longer drops aliases by
checking only the canonical `icons` map. The existing UI suite also passed, covering spacing,
Raw/Copy, bounded large output and keyboard disclosure. After typecheck, the existing enabled
macOS Paseo 0.8.0 installation reloaded successfully with only stopping/stopped/loading/ready
log additions and no new stderr. Other plugins retained their enabled/running states.
No new visual check in the native app or on a mobile device is claimed for this icon patch.

A read-only public-SDK replay of eight recent live timelines exercised **582 completed unknown
tool calls**: all stayed within the shared preview bounds, none threw, and hashes confirmed all
582 source payloads were unchanged. It included 298 bounded previews, 76 visible JSON segments
and 11 upstream-truncation cases. Only aggregate counts were retained, not personal fixtures.
This is live-data formatter verification, not visual desktop or latency/FPS measurement.

The README's focused images show the shipped renderer's UI-label/JSON view, bounded long-output preview and nested command output. They are component crops from the same browser harness, not reconstructed artwork. Captures check the compacted path, shared preview boundary and status spacing. Along with the three overview images, all six public screenshots use synthetic data and are labeled as component previews rather than live-host captures.

On the macOS Paseo 0.8.0 installation, earlier smoke checks verified 32px desktop pitch, real custom-tool icons and short summaries, readable output previews, and Show all/Show less. The beta was subsequently reloaded into that same enabled installation and reported running, without changing host preferences or restarting the daemon. The new quoted-label/path rendering was checked in the browser and renderer tests, not re-exercised in a live personal conversation. These targeted checks do not amount to the full browser matrix running in the installed app.

## Dependency review

An npm audit on 2026-09-12 reported **one low-severity advisory**, [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx), for `diff@7.0.0` in the verification dependency tree. It affects `parsePatch` and string-input `applyPatch`; this plugin imports only `diffLines`, which the advisory explicitly says is unaffected. It does not call the affected functions.

The test dependency remains pinned to the version used for the Paseo 0.8 compatibility baseline; a blanket major upgrade would not upgrade the installed host's provided module. This is a scoped dependency review, not a security certification.

## Not established

- Summary support, automatic display-mode detection or safe mixed-mode connected clients.
- Native iOS/Android UI behavior beyond the new Hermes engine tests, or a complete reconnect/virtualization/enable-disable matrix.
- Smooth full rendering of million-line payloads or a measured latency/FPS budget.
- Lossless information equivalence of Readable and Raw. Readable is explicitly derived; Raw remains the complete received representation.
- Perfect interpretation of arbitrary custom-tool output or recursive code/string decoding.
- Recovery of output omitted upstream: a visible `[Output truncated]` marker is reported, but Show all and Copy cannot recreate bytes Pi did not send.

Formatting limits do not cap host projection/storage, full Raw serialization or clipboard work. Show all intentionally removes the preview limit. Clipboard browser tests use the shared system clipboard and must not run concurrently with unrelated copying.
