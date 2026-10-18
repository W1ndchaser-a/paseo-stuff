# Changelog

## 0.1.0-beta.10 — 2026-10-18

- Show the call's main argument after the tool name on the collapsed card header: the shell command, file path, search query or URL from the native tool detail, or the first of `command`, `cmd`, `file_path`, `filePath`, `path`, `pattern`, `query` and `url` in an unknown tool's input. It is one literal value, never a generated summary: the first line of a 200-character prefix, with `…` when anything was left out. It uses the muted monospace style and shrinks before the tool name.
- Typecheck, lint and 275 tests pass with SDK 0.9.2 and 0.11.4. Checked live on a Paseo 0.12.0-beta.2 daemon in the hosted web client with real DeepSeek Harness tool calls; the desktop app and native mobile were not checked.

## 0.1.0-beta.9 — 2026-09-29

- Add two Command Center actions: **Activity: use native tool rows (for Summary)** unregisters only the tool-call transformer, so Summary groups native tool rows again; **Activity: use tool cards (Full detail)** restores the cards. The choice is per client, not saved, and resets to cards when the plugin loads. The plugin still never reads or changes the host display preference.
- The Thinking adapter stays registered in both modes; reasoning rows never join Summary groups.
- Typecheck, lint and 253 tests pass with SDK 0.9.2 and 0.10.1, including Hermes bundle evaluation of the commands and a pinned 0.9.2 host test that regroups existing history after the switch. On a live 0.10.1 daemon in the hosted web client, the commands regrouped an existing conversation in Summary and restored the cards; the desktop app and mobile were not checked.

## 0.1.0-beta.8 — 2026-09-28

- Support Paseo 0.9.2 and 0.10.0-beta.1. The manifest now declares only the minimum `>=0.8.0`, following Paseo's requirements contract; the beta.7 `<0.10.0` bound made the 0.10.0-beta.1 daemon reject the plugin. Later releases are not tested.
- Pin the SDK development dependencies to 0.9.2. Typecheck, lint and all 252 tests pass with SDK 0.9.2 and with SDK 0.10.0-beta.1. Runtime behavior is unchanged; only code comments were updated.
- Refresh the 0.9 host fixtures from v0.9.2, byte-identical in v0.10.0-beta.1. Only assistant-message Markdown splitting changed upstream; tool-call projection and grouping did not. Summary remains unsupported. Beta.8 rendered live on a 0.10.0-beta.1 daemon in the hosted web client; the desktop app and native mobile checks are still pending.

## 0.1.0-beta.7 — 2026-09-18

- Support Paseo 0.9.0-beta.1 with updated SDK dependencies and a bounded compatibility range; retain 0.8 host regression fixtures.
- Keep native plan tools and structured plan cards out of the custom tool renderer, preserving 0.9 plan suppression and disclosure.
- Add unmodified 0.9 presentation fixtures for Full detail, Summary limitations, streaming/history identity, reasoning and speech. Summary remains unsupported: 0.9 retains all calls but does not group plugin cards.

## 0.1.0-beta.6 — 2026-09-13

- Unify ordinary and codex-conversion tools under Input / Output with one Show all / Show less. Preview twenty source lines and cap automatic wrapping to twenty displayed line-heights per section. No second character cap or independently scrolling output box.
- Fix long JSON strings/plain text/Thinking bypassing the preview limit: measure wrapped content and show the same Show all even when there are fewer than twenty source lines. Full text, highlighting, selection and manual streaming disclosure remain intact; preserve ancestor scrolling and scale the cap with system text size.
- Retain complete output metadata, traces and attachment data; only unwrap pure source/text transports. Preserve JSON numeric lexemes, duplicate keys, escapes and native detail fields.
- Highlight JSON keys/strings/literals with theme-aware, readable colors. Use one selectable text with actual newlines for copying.
- Remove the old Markdown reasoning renderer, generated summaries/diffs, separate tool rendering paths and Raw/Copy toolbars. Keep tool logos, host lifecycle status, non-JSON fallback and manual streaming disclosure. Remove the unused diff dependencies.
- Use a minimal Thinking disclosure row with original plain text. Match native default labels with 14px text, natural leading and 12px icons on both desktop and mobile; remove the trial's extra 44px mobile header minimum. Browser reference sequences measure 33px pitch versus 32px all-native (previous compact trial: 60px). Host gaps remain; header hit areas are smaller than native badges. Show all keeps its 44px compact target. No negative margins, body rewriting or restored Markdown parser.
- Add three side-by-side native-reference/plugin screenshots using the same synthetic data. Replace obsolete screenshot assets so Cafe does not display the old UI.
- Local trial accepted; 239 tests pass, including wrapped-preview regressions and real Hermes bundle evaluation. No new installation or daemon restart. Summary remains unsupported; see docs/verification.md for limits.

## 0.1.0-beta.5

- Move development and releases to `geoqiao/paseo-stuff`, subdirectory `plugins/agent-activity`, retaining the `readable-agent-activity` plugin ID. Old standalone tags remain unchanged; installed Git sources do not migrate automatically.
- Fix the native client loading path by replacing eager Shiki dependencies with the function-based, non-global Prism runtime from `prism-react-renderer`. Use its explicit ESM entry to work with Paseo's neutral bundler and eager CommonJS interop.
- Keep theme-derived token colors, exact text, the highlight/cache bounds and literal fallback. Shell highlighting uses a small local grammar; token classifications can differ from Shiki.
- Add complete-bundle evaluation tests, including the actual RN 0.81.5 Hermes executable, plus language/Unicode/CRLF/streaming/failure regressions. All 251 tests pass; native phone UI confirmation is still pending.
- Reloaded the existing enabled local installation successfully. This fix is included in the monorepo beta.5; the old standalone beta.4 tag does not include it.

## 0.1.0-beta.4

- Fix the missing Get Agent Activity header icon: replace the nonexistent `ListActivity` name with the supported `Activity` glyph. Formatting, spacing, summaries and disclosure behavior are unchanged.
- Validate all 62 configured Paseo tool icon names against Lucide 0.546.0 exports, including aliases, using a pinned test-only dependency. Production still uses the public host Icon with no added runtime dependency.
- Add four tool-name normalization cases and two renderer regressions for icon size/color and manual disclosure through status updates. All seven new cases failed before the fix; all 224 tests now pass.
- Browser checks cover real SVGs for all 62 mappings in wide dark/narrow light layouts, plus the existing UI suite. Local Paseo 0.8.0 reload succeeded; these browser checks are not native-mobile verification.

## 0.1.0-beta.3

- Share hunk-aware classification between diff colors and counts, so source lines beginning with `+++` or `---` are not confused with file headers. Accept whitespace-stripped blank context lines; preserve other partial/malformed input with a conservative fallback.
- Fix a Unicode boundary case that could duplicate an earlier readable preview segment; retain complete source and selected-view Copy.
- Expose complete edit details and read range metadata (including zero) in Raw, serialized only when selected rather than while building the default preview.
- Bound Exa/GitHub summary normalization before scanning large inputs, reusing the existing header helper. An all-whitespace prefix may omit the header summary; full input remains in details.
- Delete unreachable legacy output parsers and their obsolete tests; keep active recognition/summary behavior and add actual detail-source fidelity coverage.
- Avoid retaining a full classified diff array just to count changes; memoize selected Raw serialization so Copy/Show all do not repeatedly serialize large source details.
- 217 tests pass. The initial 213-case review suite reproduced 14 failures against the previous runtime; further regressions caught repeated Raw serialization and stripped blank context before fixes. Production-component browser checks cover dark/light, narrow layout, Raw/Copy, streaming, diff colors and preview boundaries; no native-mobile or latency benchmark claim.

## 0.1.0-beta.2

- Recognize only explicitly marked Pi Code-mode `exec_command` result wrappers and expand one output layer.
- Recognize the DSH-projected ACP `content[]` wrapper's explicit `type: "content"` / nested text blocks one layer, while keeping non-text blocks in Raw.
- Keep script, exit-code, running-session, empty-output, error and upstream-truncation status visible while preserving the complete wrapper in Raw.
- Render mixed content blocks with per-segment languages under one shared 20-line / 4,000-character preview budget; unknown blocks remain available in Raw.
- Add synthetic shared and renderer regressions for ACP mixed blocks/shared preview limits, malformed/large data, multiple results, lazy metadata/image tails, streaming disclosure and selected-view Copy.
- Preserve important script errors even when another status is present; report upstream truncation before malformed literal fallback without repairing it or repeating the warning.
- Keep segmented status spacing compact instead of mounting newline-only text boxes. Refresh synthetic screenshots and verify the production renderer in wide/narrow, dark/light browser layouts.
- 202 tests; read-only replay of 582 recent tool outputs checked shared preview bounds, no formatter exceptions and source immutability. No personal payloads were published.

## 0.1.0-beta.1

Initial public release of Readable Agent Activity, an MIT fork of Colorful Agent Activity.

- Quiet icons and bounded single-line summaries.
- Literal JavaScript inputs and lexical JSON formatting, including JSON inside text blocks.
- Readable typed tool-result content; one-layer UI label decoding and repeated-path compaction.
- 20-line / 4,000-character previews, manual Show all/Show less, full selected-view Copy and complete Raw.
- Defensive malformed/large data handling and stable manual disclosure through streaming.
- Explicit Full detail-only compatibility warning for Paseo 0.8.0.
- 187 regression tests, pinned Apache-2.0 host projection fixtures, synthetic screenshots and CI.

**Beta limitations:** Summary unsupported; all connected clients must use Full detail. Native mobile is untested. Full Show all/Raw/Copy can remain expensive.
