# Verification scope

## Paseo 0.16.0 stable target (2026-11-16)

- Typecheck, lint and **97 tests** pass with the minimum pinned SDK and the no-save **0.16.0 SDK**.
- The released host pipeline folds completed formula replies, including a final formula after an earlier plain-text reply. Streaming remains native; native-reply mode remains available for formula-source search.
- UI host fixtures use release commit `c54bc39e7997c03a07402c09df2e825889432557`; no runtime plugin code or minimum requirement changes.
- These are SDK and offline integration checks. No new desktop, web-client, native-mobile or real-model acceptance is claimed.
- The CI package-load and isolated daemon checks now target **0.16.0**.


## Paseo 0.16.0-beta.1 prerelease review (2026-11-11)

- Typecheck, lint and **97 tests** pass with the no-save beta SDK, using the
  stable host fixtures. A separate check bundles the beta tag's actual host
  presentation/projection/folding source and the production Math transformer.
- In all three display modes, completed formula rows preserve their source
  identity and streaming stays native. The beta's #8811 fix folds native tool
  work before a formula reply while keeping the rendered formula visible.
- The stable **0.15.4** target still needs native-reply mode for formula-turn
  folding. Keep that action for stable clients and for searching formula source.
- No beta live UI, daemon installation or native device acceptance was performed.
  Evidence: maintenance `evidence/2026-11-11/math-renderer-beta-tests.json` and
  `evidence/2026-11-11/beta-contract-tests.json`.


## Paseo 0.15.4 stable target (2026-11-11)

- Typecheck, lint and all **97 tests** passed with the no-save **0.15.4**
  client, plugin and protocol SDKs on 2026-11-10. The minimum SDK pin stays
  **0.13.2**. Production code and plugin versions are unchanged.
- Host fixtures now identify tag **v0.15.4**, source commit
  `1c00b365c9e0b74c1580eba33d905d693125ae21`. Every vendored source and the
  reduced message-ID helper match that tag; runtime content is unchanged from
  0.15.3. Full, Collapse tool calls and Collapse turns retain the same behavior.
- After refreshing fixture paths and the host-protocol alias, typecheck, lint
  and the full suite also pass with the minimum SDK. Target-SDK checks from
  2026-11-10 remain applicable to the unchanged runtime.
- Stable 0.15.4 still lacks upstream #8811 reply folding and #8756 mirror
  installation fixes. Existing stable-release workarounds remain in place.
- This target records SDK and offline host-pipeline checks. No 0.15.4 live UI,
  isolated daemon load, native mobile or Windows acceptance was performed.
- Local evidence: `.scratch/upstream-compat-watch/evidence/2026-11-10/upstream-0.15.4/review.json`
  and `.scratch/upstream-compat-watch/evidence/2026-11-11/source-audit.json`.


## Paseo 0.15.3 compatibility check (2026-11-07)

- No production code or version change: this is verification of beta.8 with updated
  development fixtures and documentation, not a new published release.
- After `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund`,
  `npm run prepare:markdown` and `npm run prepare:wasm`, `npm run check` passes
  with the pinned **0.13.2** SDK: typecheck, lint with zero warnings/errors and
  **5 files / 97 tests**. Installing client, plugin and protocol **0.15.3** with
  `--no-save --package-lock=false` and repeating the check gives the same result.
  The complete-client Hermes VM cases ran, with no skipped tests.
- Nine unmodified **v0.15.3** source files and the reduced message-ID helper are
  pinned at commit `d91ae138cb931447635e94296023414a58bedcc5`, with target protocol
  0.15.3. Their runtime content is byte-identical to the old 0.14.0 fixtures. Tests
  run the real host pipeline for Full, Collapse tool calls and Collapse turns:
  whole completed formula replies, native streaming, unsupported/oversized fallback,
  stable source identity, tool grouping, turn folding and the chat Find model.
  These are offline host integration tests with synthetic input.
- The formula-reply folding limitation persists in 0.15.3. Upstream
  [#8811](https://github.com/getpaseo/paseo/pull/8811) merged on main at
  `dc51a3b6a9e2bec35f5c250c76181e4446c02fc2`, but the 0.15.3 tag lacks its
  `sourceKind` projection and plugin-reply recognition. It awaits a release.
  Native-reply mode remains the workaround on 0.14 through 0.15.3. Activity's
  separate transformed-work folding issue
  [#8875](https://github.com/getpaseo/paseo/issues/8875) remains open.
- On an isolated macOS **0.15.3** daemon (temporary home, `127.0.0.1:6863`,
  relay off), `npm pack` generated the parser/WASM assets, and the unpacked tarball
  passed `npm ci --omit=dev --ignore-scripts`. Installed as a directory beside
  Readable Agent Activity beta.14, it reported `running`. This checks real daemon
  compilation/loading, not live UI rendering or an RPC call from a client.
- Logs and package artifacts: `/tmp/paseo-ui-0153-evidence/`, including
  `math-renderer-sdk0132-check.log`, `math-renderer-sdk0153-check.log`,
  `math-production-install.log`, `plugin-status.json` and `daemon-status.json`.
  The isolated daemon was stopped and its final status was `stopped`.
- **Not verified on 0.15.3:** live web UI, desktop app, native iOS/Android or Windows.
  The last live web-client results are recorded below. The main daemon and existing
  installations were not changed.

## Beta.8 — Paseo 0.14.0 (2026-10-30)

- `npm run check` with the pinned **0.13.2** SDK and with the **0.14.0** client, plugin and
  protocol packages installed without saving: typecheck, lint and **97 tests** each. Host
  tests run nine unmodified v0.14.0 sources plus a reduced `types/stream.ts` in Full,
  Collapse tool calls and Collapse turns, including chat Find.
- Isolated Paseo **0.14.0** daemon (CLI 0.14.0 from npm, temporary home, `127.0.0.1:6840`,
  relay off): the packed beta.8 tarball, unpacked, installed with `npm ci --omit=dev` and
  added beside Readable Agent Activity beta.14 and DeepSeek Harness beta.15, status `running`.
- In the 0.14.0 web client (port 6851), a DeepSeek Harness 0.2.1-rc.5 reply with inline and
  display LaTeX rendered as formula images. Under **Collapse turns**, with Activity's native
  rows, that turn stayed unfolded with its tools in a "Used 2 other tools" group, as
  documented; turns with formula-free replies folded. After **Math: use native replies to
  search formula source**, the same turn folded and the reply showed LaTeX source.
- The console showed no plugin errors.
- **Not verified:** the desktop app, native mobile, chat Find on 0.14.0 and Windows outside CI.

## Beta.8 — Paseo 0.13.2 registry install (2026-10-29)

- Isolated Paseo **0.13.2** daemon (CLI 0.13.2 from npm, temporary home, port 6820, relay
  off, `pluginsEnabled` on): `paseo plugin add geoqiao/<slug>` installed all three plugins
  from the registry, status `running` for each. The registry record resolved npm
  `0.1.0-beta.8`.
- In the 0.13.2 web client (the server package's `web-ui` served locally), a completed
  DeepSeek Harness reply rendered the inline `a^2+b^2=c^2` and the display
  `\sum_{k=1}^{n} k = \frac{n(n+1)}{2}` as formula images, with Show LaTeX and
  Copy LaTeX on the display formula. This covers the markdown-it 14.3.3 bundle in a client.
- **Not verified:** the desktop app, native mobile, light/dark switching and Find.

## Beta.8 — markdown-it 14.3.3 (2026-10-28)

- `npm run check`: typecheck, lint and 90 tests pass, including the parser tests and
  the Hermes evaluation of the client bundle. The packed `shared/generated/markdown.js`
  bundles markdown-it 14.3.3. `npm audit` no longer reports markdown-it.
- Isolated Paseo **0.13.2** daemon (CLI 0.13.2, temporary home, port 6798, relay off): the
  packed tarballs were extracted, production dependencies installed from the shipped
  `npm-shrinkwrap.json`, and all three plugins added from those directories. Status `running` for each.
- **Not verified:** rendering in a client. Only the bundled parser changed; beta.7's
  rendering checks in the 0.13.2 web client are the latest UI evidence.

## Beta.7 — Paseo 0.13.2 registry install (2026-10-27)

- Isolated Paseo **0.13.2** daemon (temporary home, port 6812, relay off):
  `paseo plugin add geoqiao/math-renderer` resolved the registry record to npm
  `paseo-math-renderer@0.1.0-beta.7`, status `running`.
- In the 0.13.2 web client (`app-dist` served locally) at 1400 × 1000, a DeepSeek
  Harness reply (DSH 0.2.1-rc.4) rendered the inline `$a^2 + b^2 = c^2 and the display
  sum as formula images with Show LaTeX and Copy LaTeX. The console showed no plugin
  errors.
- **Not verified:** the desktop app, native iOS/Android and live streaming.

## Beta.7 — Paseo 0.13 only, host Markdown for formula-free blocks (2026-10-26)

- `npm run check` on Node 24.18.0 with the pinned **0.13.2** client, plugin and protocol
  packages: typecheck, lint with zero warnings/errors and **5 files / 90 tests**,
  including the client bundle evaluated in the RN 0.81.5 Hermes executable.
- The client bundle, built with the 0.13.2 compiler options, compiles with `hermesc`
  from RN 0.86.3 (`hermes-compiler@250829098.0.17`), the React Native line of the
  0.13.2 app. This compiles the bundle only; it does not run it.
- Host tests use seven unmodified v0.13.2 sources: presentation, plugin projection, tool
  grouping and the chat Find model. A rendered reply is one plugin row whose
  `getStreamItemMessageId` equals the source message ID, so Find can target it.
  Unsupported or oversized replies stay one native row. Tool rows are unchanged in
  Summary and Full detail.
- Isolated Paseo **0.13.2** daemon (temporary home, port 6816, relay off), with the
  packed beta.7 tarball unpacked, installed with `npm ci --omit=dev` and added as a
  directory, beside Readable Agent Activity beta.12 and DeepSeek Harness beta.14. All
  three reached status `running`.
- DeepSeek Harness (DSH 0.2.1-rc.3, `deepseek-v4-flash`) ran `ls -la` and then replied
  with a heading, a table, a paragraph with inline `$E = mc^2$` and a reference link, a
  display integral, an ordered list starting at 3 with an inline formula, a Python code
  block, a relative file link and a reference definition.
- In the 0.13.2 web client (the desktop app's `app-dist` served locally) at 1400 × 1000:
  - The heading, table, code block and the paragraph with `./notes.txt` used the host
    renderer, with code highlighting and a Copy code button. The reference link in that
    paragraph resolved to the definition at the end of the reply.
  - The formula paragraph, display integral and list used the plugin renderer. The list
    kept the numbers 3 and 4, and the reference link in the formula paragraph resolved.
  - Show LaTeX showed the integral source and changed to Show formula.
  - Chat Find for `find-me-token` (host segment) and `in 1905` (plugin paragraph)
    each found 2 of 2 and highlighted the match inside the rendered reply. `mc^2` found
    only the prompt: formula source is not searchable in rendered replies.
  - Dark mode and a 390 × 844 layout rendered the table, formulas and code block
    without overflow. After each page reload, the reply rendered again.
- **Not verified:** the desktop app, native iOS/Android, live streaming (the reply had
  finished before viewing), the native-reply Command Center actions on 0.13.2 (covered
  by the bundle test only) and registry installs of beta.7.

## Beta.6 — Paseo 0.13.0 registry install (2026-10-26)

- `npm run check` on Node 24.18.0 with the **0.13.0** client, plugin and protocol
  packages installed without saving: typecheck, zero lint warnings/errors and
  **6 files / 82 tests**.
- Isolated Paseo **0.13.0** daemon (temporary home, port 6811, relay off):
  `paseo plugin add geoqiao/math-renderer` resolved the registry record to npm
  `paseo-math-renderer@0.1.0-beta.6`, status `running`.
- In the 0.13.0 web client (`app-dist` served locally), a DeepSeek Harness reply
  rendered inline `$E = mc^2$` and the display integral as images, with
  Show LaTeX and Copy LaTeX. The browser console showed no plugin errors.
- With a daemon whose npm used `registry.npmmirror.com`, the registry install fails
  with "npm artifact changed since review" (issue #35); `npm:paseo-math-renderer`
  installed with the mirror unchanged. See the root README.
- **Not verified:** the desktop app, native iOS/Android, light/dark switching and Find
  on 0.13.0.

## Beta.6 — npm package (2026-10-18)

- `npm run check` passed on Node **24.18.0** with the pinned **0.9.2** packages:
  typecheck, zero lint warnings/errors and **6 files / 82 tests**. An isolated copy with
  the **0.11.4** client, plugin and protocol packages installed without saving passed
  the same check.
- `npm pack` produced the package; `postpack` restored the source manifests. The
  packed `paseo-plugin.json` has no `build`, and `npm-shrinkwrap.json` contains only
  MathJax, resvg and their dependencies, with `@xmldom/xmldom` at the overridden 0.9.12.
- Isolated Paseo **0.12.0-beta.3** daemon (temporary home, port 6801). Its npm used a
  local Verdaccio registry holding the tarball; other packages were proxied from npmjs.
  Verdaccio omits the `_hasShrinkwrap` flag that npmjs sets on packages with a
  shrinkwrap, so the test set that flag in Verdaccio's storage to match npmjs.
  - `paseo plugin add npm:paseo-math-renderer@0.1.0-beta.6` installed the package: status `running`, no error.
    npm placed the dependencies under the package's own `node_modules` at the
    shrinkwrapped versions. Without the flag, npm ignored the shrinkwrap and resolved
    newer versions.
  - The unpacked tarball, after `npm ci --omit=dev --ignore-scripts`, installed as a
    directory: status `running`, no error.
  - A `.tgz` path, `npm:<path>` and `npm:file:<path>` are rejected as sources, as
    the Paseo source reference states.
- The first npm installation failed: Paseo's compiler also resolves type-only imports,
  and `import type Token from "markdown-it/lib/token.mjs"` had no `markdown-it` after
  it moved to development dependencies. `shared/markdown.ts` now derives `Token` from
  the generated parser.
- In the **0.12.0-beta.3** web client (`app-dist` served locally) on that daemon, a
  DeepSeek Harness reply rendered `$\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i,
  `\(e^{i\pi}+1=0\)`, `$ax^2+bx+c=0 and `$\Delta = b^2-4ac \ge 0 inline, and the
  `$` integral as a block with **Show LaTeX** and **Copy LaTeX**. `$5 and $10` stayed
  text. The browser console showed no plugin errors or warnings.
- **Not verified:** installation from the public npm registry (the package is not
  published yet), the desktop app and native iOS/Android.

## Beta.5 — inline math (2026-10-18)

- `npm run check` passed on Node **24.18.0** with the pinned **0.9.2** packages:
  typecheck, zero lint warnings/errors and **6 files / 82 tests**. An isolated copy with
  the **0.11.4** client, plugin and protocol packages installed without saving passed
  the same check.
- New tests cover `\(...\)` and `$...$` parsing, prices and unclosed delimiters
  staying text, the 64/65 formula limit, inline depth and height from the renderer, and
  the two recorded model replies (27 and 9 formulas, now counting inline ones). The
  complete client bundle still loads in the RN Hermes executable test.
- Live test on an isolated Paseo **0.12.0-beta.2** daemon (temporary home), with the
  plugin installed from this directory and the hosted web client at app.paseo.sh. A
  DeepSeek Harness agent repeated two prepared replies verbatim:
  - `$x_i$`, `\(\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i\)`, `$ax^2+bx+c=0$`,
    `$\Delta = b^2-4ac \ge 0$`, `$e^{i\pi}+1=0$` in a bold list item, `$x^2$`,
    `$\alpha_1$` and `\(E=mc^2\)` in a Chinese sentence rendered as inline images on
    the text baseline. The `$$` block in the same reply rendered with its action row.
  - `$5 and $10, or US$7` and `价格是 $5 和 $10` stayed text.
  - A period, comma or `。` after a formula stayed on the formula's line, at 1280px
    and at 390px width. The DOM text contains U+2060 before that punctuation.
  - Tapping `E=mc^2` showed `\(E=mc^2\)`; tapping the source showed the formula again.
  - The browser console showed no plugin errors or warnings.
- **Page reload (hosted client, 0.11.4):** after reloading the page, the most recent
  reply stayed native while earlier replies rendered. A temporary console log in the
  transform showed the host passing that reply with `phase: "streaming"`. The same
  behaviour occurred with the unchanged beta.4 code, so it is not caused by inline math.
  Reported as [getpaseo/paseo#7322](https://github.com/getpaseo/paseo/issues/7322),
  then closed because the 0.12.0-beta.3 client does not show it.
- The same daemon with the **0.12.0-beta.3** web client (`app-dist` from the desktop
  app, served locally):
  - After a page reload, the most recent reply rendered, including `$y^2$`.
  - Chat Find for `Prices stay` found 2 of 2 and highlighted the match inside the
    rendered reply. `。价格是` found 1 of 1 next to a formula, so U+2060 does not
    break Find. `mc^2` found no match: formula source is not searchable.
  - A reply with inline math, a table and `$$` stayed native as a whole, as intended.
  - Chat outline jumped from the second prompt back to the first, past rendered rows.
- **Not verified:** the desktop app, native iOS/Android, and the 0.11.4 daemon with
  this beta.

## Paseo 0.11.2 check (2026-10-11)

- No runtime change; the released beta.4 code is unchanged. This check accompanies the
  new `OVERVIEW.md` and the install commands for Paseo 0.11.
- After a clean `npm ci` and both prepare steps, `npm run check` passed on Node
  **24.18.0** with the pinned **0.9.2** packages: typecheck, zero lint warnings/errors
  and **6 files / 66 tests**. An isolated copy with the **0.11.2** SDK/protocol/client
  packages installed without saving passed the same check.
- The existing local directory installation (`paseo-math-renderer-prototype`) reports
  `running` on a Paseo 0.11.2 daemon, and its log shows `Plugin ready` with no error
  output.
- Paseo's registry lists the plugin as `geoqiao/math-renderer`, pinned to commit
  `abc4d96`. Its record names the tag `readable-agent-activity-v0.1.0-beta.9`; the
  plugin directory at that commit is identical to `math-renderer-v0.1.0-beta.4`.
- Install commands, run on an isolated Paseo 0.11.2 daemon (temporary home, relay
  disabled, no client connected): `paseo plugin add geoqiao/math-renderer` installed
  commit `abc4d96` and the `git:` command with tag `math-renderer-v0.1.0-beta.4` installed
  `f913621`; both ran the preparation commands and reached `running` with `Plugin ready`.
  The old source without `git:` is rejected there as a registry ID.
- **Not verified:** formula rendering, chat Find and the host fixtures against 0.11
  sources, and any 0.11 client.

## Beta.4 — Paseo 0.9.2 / 0.10.0-beta.1 compatibility (2026-09-28)

- Manifest range: `>=0.9.0-beta.1`, a minimum-only range under Paseo's requirements
  contract. The previous `<0.10.0` bound made the 0.10.0-beta.1 daemon reject the
  plugin. No newer API is adopted, so the minimum stays.
- The public `@getpaseo/plugin` dist is byte-identical in 0.9.0-beta.1, 0.9.2 and
  0.10.0-beta.1. The host app's React, React Native, Expo, Zod, React Query and
  markdown-it versions are identical in all three tags. The daemon plugin compiler and
  the app plugin loader are unchanged from v0.9.0-beta.1 to v0.10.0-beta.1.
- Exact SDK/protocol/client target: **0.9.2**. After a clean `npm ci` and both prepare
  steps, `npm run check` passed on Node **24.18.0**: typecheck, zero lint
  warnings/errors and **6 files / 66 tests**, including RN 0.81.5 Hermes evaluation.
  An isolated copy with the 0.10.0-beta.1 SDK/protocol/client packages passed the same
  check. Node 22 was not run locally; CI covers Node 22 and 24.
- Host fixtures now come from tag `v0.9.2` (`c67b7158b441`); all eight files are
  byte-identical in `v0.10.0-beta.1` (`52d345db7f27`). Three changed since
  v0.9.0-beta.1 (upstream PRs #5146 and #5167): history splits native assistant
  messages into Markdown block rows (`<id>:block:<n>`, `blockGroupId` = message id)
  as live rows already were; `getStreamItemMessageId` maps a row to its message;
  link-reference-definition blocks fold into a neighbour; and chat Find reveals a
  message ID, with per-location counts and typed failures.
- Six stale expectations were updated without relaxing them. Unsupported and
  oversized replies previously had to equal the single source row; they must now
  equal the host's exact native block rows (kind, IDs, `blockGroupId`, cursor,
  timestamp, lossless text) and match the presentation without the Math transformer.
  Adding a supported reply to that case fails the test. In native-reply mode, every
  native row resolves to the chat Find target through `getStreamItemMessageId`; the
  rendered Math row still does not, which is the unchanged host gap.
- Live 0.10.0-beta.1 check: beta.4 at PR head `1f44a52` was reloaded into the existing
  enabled `paseo-math-renderer-prototype` installation, which reports running. In the
  hosted web app (app.paseo.sh, desktop Chromium, 1280×720, paired through the relay),
  a completed real DeepSeek Harness reply rendered `\int_0^1 x^2\,dx = \frac{1}{3}` as
  a block formula with Show LaTeX and Copy LaTeX, in light and dark schemes.
- Chat Find in render mode reported `Failed` for a token in that reply's text, the
  documented host gap; a control search in the user message found 1 of 1. After
  "Math: use native replies for chat Find", the same search found 2 of 2 and highlighted
  the reply text. The formula then showed as native Markdown, where the host renders
  `\,` as `,`. "Math: render block formulas" restored the rendered formula.
- Not verified: the Paseo desktop app, a live 0.9.2 daemon, live streaming (the turn had
  finished before viewing), narrow layouts and mobile. 0.10.0-beta.1 is a prerelease;
  this is not stable 0.10 acceptance.

## Beta.3 — Paseo 0.9 migration (2026-09-18)

- Exact SDK/protocol/client target: **0.9.0-beta.1**. `npm run check` passed on
  Node **22.23.2** and **24**: typecheck, zero lint warnings/errors and **6 files /
  66 tests**, including real RN 0.81.5 Hermes evaluation.
- Nine new tests use unmodified tagged host presentation, grouping, projection,
  identity and Find-model sources. They cover native streaming, whole completed
  replies, stable history IDs, unsupported/oversized fallback, native tools in both
  display modes and canonical IDs after removing the transformer.
- Complete client-bundle checks exercise repeated native/render commands and
  cleanup, including no duplicate transformer registrations. These commands are
  client-local and reset on contribution reload; there is no hidden saved setting.
- Compiled client and server with the installed Paseo app's actual compiler. The
  compiled backend rendered a quadratic formula successfully (135×47 logical px).
- Reloaded the existing enabled ID `paseo-math-renderer-prototype` at
  `127.0.0.1:6767`; the 0.9.0-beta.1 daemon reports running/ready.
- A synthetic Pi turn produced two formulas in its completed Paseo timeline. Its
  source was inspected, and the test agent was archived. Desktop UI automation
  failed to start, so this is not a claim that its live pixels were inspected.
- The actual components and real local MathJax/resvg backend passed nine browser
  interaction groups: exact LaTeX clipboard, manual source state, image decode,
  light/dark and desktop/390px layouts, overflow/touch targets, malformed TeX,
  delimiter edits, unsupported Markdown and RPC retry. A further check confirms
  native output throughout the simulated streaming phase, then two rendered images
  after completion. No browser runtime errors; compact screenshot inspected.
- Those browser checks use React Native Web with host/RPC adapters. Native mobile
  rendering, actual installed Command Center interaction and reconnect/multi-client
  acceptance remain unverified.
- Chat Find still cannot target transformed host rows. The tested native-reply
  action restores original IDs; this is an explicit workaround, not an upstream fix.

## Historical beta.2 evidence (Paseo 0.8.0)

## Repeatable package checks

Run npm ci with the flags in README, prepare:markdown, prepare:wasm, and npm run check.
The monorepo CI installs each plugin separately on Node.js 22 and 24.

The 57 tests cover delimiters, CRLF/trailing whitespace, escaped dollars, code,
inline-source preservation, nested containers, unsupported Markdown bypass,
limits, actual PNG output, caching and disposal. Synthetic A/B fixtures are
model-generated test text, not personal conversations.

The host fixtures are unmodified Paseo 0.8.0 sources with recorded provenance.
Both the real projection and identity model are used: in 0.8.0 an explicit
replacement ID is plugin-global. Omitting it derives sourceId/index and avoids
colliding when the host splits one reply into several source rows. An earlier
test adapter wrongly prefixed explicit IDs and therefore missed this bug.

Assistant transformer phase is complete even during live text updates in this
host version. The parser therefore depends on text and delimiter closure, not phase.
Source data is retained at every prefix of synthetic A.

## Native bundle loading fix (beta.2)

The beta.1 client bundle reproduces the reported `Cannot read property 'prototype'
of undefined` in the RN 0.81.5 Hermes executable, at `getDecoder` during eager
loading of `markdown-it/dist/markdown-it.js`. Its bundled `EntityDecoder` is a
class expression. The later parser fallback cannot catch entry evaluation errors;
daemon status can still report running/ready while the mobile client fails to load.

`prepare:markdown` uses the existing TypeScript build dependency to lower the pinned
markdown-it 14.3.2 UMD distribution to ES5 syntax, preserving comments and removing
its stale source-map reference. The generated parser has an ESM wrapper: importing
the constructor as CommonJS would make Paseo's eager interop read restricted
function properties in Hermes and fail with `Restricted in strict mode`.
No parser downgrade, runtime transpiler, host patch or global polyfill is needed.
Generated files are ignored; the install manifest and CI rebuild them.

`tests/client-bundle.compat.test.js` matches the pinned Paseo 0.8.0 compiler settings
and eager CommonJS interop, then evaluates the entire entry from a string. The old
code passes in Node but fails in Hermes with the exact reported error. The fixed
entry passes both engines: registration, all prefixes of synthetic A/B, entity
decoding, delimiters/nested containers, input limits, native fallback and cleanup.
The Hermes test skips explicitly where its executable is unavailable; `HERMES_BIN`
can supply one. The local macOS run executed it successfully.

Host modules, UI hooks and schema construction are stubbed only in this engine
smoke test. Existing tests use real Zod and MathJax/resvg. These results do not
establish on-device iOS/Android UI, clipboard or RPC behavior. The beta.1 release
tag does not contain this fix.

An isolated copy of this plugin, with no dependencies or generated files, passed
every manifest build command and all 57 tests, including Hermes. Typecheck and
lint passed without warnings. The already-enabled local installation
`paseo-math-renderer-prototype` was reloaded on `127.0.0.1:6767` (app/daemon 0.8.0)
and reported running / Plugin ready. This status confirms host compilation and
backend readiness, not phone rendering. The temporary install copy was removed.

The installed Paseo 0.8.0 compiler also compiled both beta.2 entries in an offline
harness; the compiled server produced a PNG through its registered render handler.
This verifies the actual host compiler, without claiming a live phone RPC check.

## Bold Greek symbols (beta.2)

A valid multivariate normal density passed Markdown parsing but failed MathJax
conversion with `Undefined control sequence \boldsymbol`. The renderer enabled
only `base` and `ams`; MathJax 3 provides `\boldsymbol` in a separate extension.
The extension is now statically imported and explicitly enabled. All resources
remain bundled and the existing input/image bounds still apply.

The complete expression is covered in `tests/live-regressions.test.ts`, including
source preservation, the assistant-message transformer, real PNG output in light
and dark colors, and pixel dimensions at 3× density. It failed before the change
and passes after it. Typecheck, lint and all 57 tests pass, including Hermes.
Existing failed cards can use Retry after the plugin is reloaded.

## Desktop observation and local replay

The plugin was installed and reloaded on macOS Paseo app/daemon 0.8.0 without
restarting the daemon or changing other plugin enable states. Actual generated
replies mixed Markdown prose with quadratic equations, integrals, matrices,
aligned derivations, list/quote formulas and a long 24-term equation.

A contained six valid formulas. B contained five valid formulas and one
deliberately unknown TeX command. After correcting a redundant math-fence
delimiter pair, real backend replay rendered all eleven valid formulas.
The invalid one remained source and did not prevent the next formula rendering.
Live deltas (12 for A, 6 for B) exactly reconstructed the final history text.

Selected App observations covered live completed-block rendering, matrices,
long-equation overflow, preserved invalid source, and a later valid formula.
They did not exhaustively verify every nested container or interaction. The
earlier duplicate-ID build could leave stale nodes in a mounted view; closing
and reopening that old tab is needed, and cleanup of every polluted old view
was not recorded as a complete acceptance result.

## Browser interaction checks

Nine local Chromium groups used actual React Native Web plugin components and
real MathJax/resvg, with preview adapters for host hooks and RPC transport:

- Exact LaTeX clipboard content and English Copied feedback.
- Manual source view retained across appended text and a theme change.
- Matrix/aligned PNG decoding.
- Independent horizontal overflow at 390px and 44px compact action targets.
- One muted English toolbar per formula, no duplicate message toolbar.
- Invalid TeX source fallback.
- Closure promotes streamed source to a formula image.
- Unsupported image Markdown bypass.
- Simulated transport failure preserves source; Retry restores rendering.

No browser pageerror occurred. Screenshots in images/ use synthetic English
text and are labeled component previews. These are not screenshots of a mobile
device or proof of real-App clipboard/reconnect behavior.

## Not accepted as tested

Native iOS/Android; continuous inline math layout; semantic MathML; full native
Markdown interactions; all combinations of Summary/Full and other plugins;
real-App clipboard, light mode, virtualized source state, disable/re-enable and
network reconnect; large RPC payloads across relay; sustained CPU/memory or
multi-client load. Input bounds are not a hard execution-time sandbox.

Tests contain only synthetic data. No local host configuration, user credentials,
conversation IDs or personal captures are included in this package.
