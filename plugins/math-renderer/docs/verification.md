# Verification scope

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
- **Not verified:** formula rendering, chat Find and the host fixtures against 0.11
  sources, and any 0.11 client. The registry and `git:` install commands follow Paseo's
  source reference and were not run.

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
