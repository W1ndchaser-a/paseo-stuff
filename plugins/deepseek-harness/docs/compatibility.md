# ACP reasoning compatibility

DSH's ACP bridge (`@deepseek-ai/dsh-acp`, `assistantUpdates`, still present in
0.1.7-rc.2 and 0.2.0-rc.1) sends a message's `agent_thought_chunk` and
`agent_message_chunk` with the same `messageId`. ACP v1
([Prompt Turn → Message IDs](https://agentclientprotocol.com/protocol/prompt-turn))
says chunks with the same `messageId` belong to the same message, and a thought
and an answer are different messages. Paseo SDK 0.9.2 and 0.10.1 follow that
rule: [`resolveChunkId()`](https://github.com/getpaseo/paseo/blob/v0.10.1/packages/plugin/src/server/acp-internal/connection.ts#L922)
keys buffers by the explicit ID regardless of chunk kind, so the reasoning is
prepended to the answer. Reported upstream as
[deepseek-harness#8235](https://github.com/deepseek-ai/deepseek-harness/discussions/8235).

The bridge appends `:thought` only to nonempty string IDs on
`agent_thought_chunk` notifications. Assistant IDs, text, and other fields are
unchanged; missing, null, empty, or malformed IDs retain existing behavior.
ACP 1.4.0 defines `MessageId` as a string (`zMessageId = z.string()`), so the
suffix needs no UUID conversion. It assumes native DSH IDs do not occupy the
suffixed thought namespace; observed DSH message IDs are UUIDs. Remove the shim
once dsh-acp sends distinct IDs for thought and answer chunks.

Verified 2026-09-29 with synthetic ACP peers and the real `runAcpProvider()`:

- SDK 0.9.2: the nine tests in `server/reasoning.test.ts` went from eight
  failures plus the passing no-ID control to nine passes. Typecheck, lint,
  and the full suite pass (74 tests / 3 files).
- Installed Paseo 0.10.1 SDK: the same nine cases changed from eight failures
  to nine passes. For this isolated check, TypeScript was transpiled locally,
  the test registration import was changed from Vitest to `node:test`, and the
  SDK import targeted the app's bundled module. Electron's helper ran in Node
  mode.
- Cases cover exact `Thinking.` / `Answer.` separation, multiple chunks,
  thought/text interleaving with stable IDs, unchanged answer `messageId`,
  no-ID fallback grouping, native load, and the load-to-resume translation.
  History updates before load acknowledgment are checked at the bridge
  boundary; SDK integration checks turns after restore. At that verification date DSH resumed
  without replay, and the 0.10.1 SDK could drop pre-acknowledgment replay because it
  assigns its native session ID after the load response. This shim does not
  change that separate limitation or the SDK's grouping of interleaved blocks.

Live check, 2026-09-29: the installed plugin was reloaded from the fix on a
macOS Paseo 0.10.1 daemon, and one DSH turn ran with `deepseek-v4-flash`
(thinking High). In the hosted web client, the reasoning appeared only in the
collapsed Thinking block and the answer contained only the reply text. Mobile
was not checked. The shim does not repair host timeline items stored before
the fix. The plugin's minimum Paseo requirement is unchanged.

## v4 session history replay

The compatibility stream now replays recognised v4 logs before a successful
translated load response; native load and resume errors bypass it. The historical
0.10.1 observation above is not the current 0.13.2 and 0.14.0 contract: Paseo 0.13
and 0.14 admit updates in its load replay window. The provider regression checks that
window on 0.13.2 and 0.14.0 and explicitly records the empty-history behavior of the minimum 0.11.4
SDK. See [verification.md](verification.md) for the executed checks and limits.

The beta.21 reader recognises all 63 event types from the published DSH
0.2.2-rc.2 v4 catalog, including `team/mode`. It displays the four conversation/tool types and omits
auxiliary metadata, matching the ACP presentation scope. Unknown events may be
omitted only with DSH's explicit `ignorable: true` envelope and no surface
operation or source references; their payload can be any JSON value. Unknown
required events and unsupported image content still prevent replay. Synthetic
catalog coverage and a macOS 0.15.3 desktop reload are recorded in verification.

## DSH 0.2.2-rc.3

The rc.3 release tags retain the rc.2 CLI, ACP, Session and persistence
implementation sources. Their published ACP, Session and persistence JavaScript
also matches byte for byte. Beta.21 passes no-inference production-provider
initialization, model/reasoning configuration, listing and fresh-process replay
of official batched text and Team-mode records with SDK 0.15.4 on Node 24.18.0.
All 63 event types and the existing resume, reasoning-ID and image-startup
adapter conditions remain unchanged. See [verification.md](verification.md) for
the package and tagged-source evidence and device limits.

## Paseo 0.15.4 and DSH 0.2.2-rc.2

The 0.15.4 public SDK retains the resolved launch and ACP load-replay interfaces.
Typecheck, lint and 251 tests pass with both the pinned 0.11.4 SDK and no-save
0.15.4 SDK. The production provider also passes official DSH 0.2.2-rc.2
initialization, catalog/list, configuration and fresh-process persistence reopen after
an official batch append of synthetic text and Team-mode events, plus cleanup
on Node 24.18.0 without model calls. DSH now requires Node 24.9+ for its CLI;
the plugin's Node 22.19+ requirement remains useful for older DSH versions.

Compared with 0.2.1-rc.5, the
[ACP configuration path](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/acp/acp/src/index.ts)
now delegates model changes to the Agent's durable model selection. A configured
session records `model/selection` events even before a model prompt. Beta.19
skips those bookkeeping events so they do not discard the transcript or produce
an unsupported-history warning. Its tarball also
loads as running with runtime-only dependencies on an isolated 0.15.3 daemon;
provider diagnostic and model/reasoning discovery pass without model calls.

The official peer still advertises resume without legacy load, shares reasoning
and answer message IDs, writes v4 logs and ships the stale default ACP model.
The existing resume, reasoning and image-startup adapters remain in place.
The raw ACP advertises images as disabled; the private startup repair enables
the real image capability without changing user configuration.

The current
[surface implementation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/core/session/src/surface.ts)
orders replacement ranges by surface position. Event sequence IDs can be
non-monotonic after replacement, so numeric start/end ordering is not a valid
compaction assumption. Beta.19 recognises replacements correlated with the preceding
compaction marker without requiring numerically increasing endpoints. Original
messages and full tool output remain visible after compaction/pruning, including
repeated prefix compaction. Unknown replacements retain the safe fallback.
See [verification.md](verification.md) for scope and evidence.

## Paseo 0.14.0

Paseo 0.14 keys each ACP chunk ID by its kind (getpaseo/paseo#7272), so a reasoning
chunk and an answer chunk with the same native message ID no longer share a timeline
ID. The `:thought` suffix from the 0.1.0-beta.13 fix is then redundant but harmless:
it renames only the reasoning row. It stays, because 0.11 to 0.13 still need it. The
reasoning tests now assert distinct IDs and that only the answer keeps `messageId`,
so they pass under both SDK lines.

0.14 also releases an idle agent's runtime after 60 minutes. The ACP shim does not
advertise `session.can_stop_runtime`, so the host releases DSH sessions too, then
resumes them through `session/load` with history replay on the next prompt. The
agent manager treats an existing durable timeline as already primed and does not
append the provider replay. A live 0.14.0 check confirmed that the resumed agent kept
its context and that the timeline gained only the new turn.

## Paseo 0.16.0

Typecheck, lint and all 251 regression tests pass with the published 0.16.0 SDK.
Minimum requirements and the 0.11.4 development pins are unchanged. The official
DSH rc.3 process and persistence checks above used SDK 0.15.4; no new model turn
or live UI check was performed for 0.16.0.
