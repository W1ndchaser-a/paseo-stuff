# Paseo 0.13 through 0.16.0 compatibility

## Supported scope

Beta.14 requires **Paseo 0.13.0** and is checked against **0.16.0**, using the **Full**
chat display (0.13: **Full detail**). It pins the 0.13.2 SDK and protocol packages, and
its checks also pass with the 0.16.0 SDK installed without saving. Host-pipeline tests
run unmodified 0.16.0 sources (see [fixture provenance](../tests/fixtures/paseo-0.16.0/README.md)).
The last live web-client check used a 0.14.0 daemon and web client (see
[verification](verification.md)). Paseo 0.8 to 0.12 are no longer supported; beta.11
remains on npm for them.

The manifest declares only a minimum, `>=0.13.0`. Per Paseo's
[requirements contract](https://github.com/getpaseo/paseo/blob/d2941157a8f91512daf54fc688241d416e8f5ebd/public-docs/plugins/reference.md),
this matches later releases and prereleases, including future breaking releases.
It is not a claim that those releases were tested. Add an upper bound only when a
specific later release is shown to be incompatible.

macOS is the tested installed host. Paseo 0.13.2 and 0.14.0 apps use React 19.2.3 and
React Native 0.86.3. Native iOS/Android UI remains unverified.

**Tool cards support only the Full display.** A client using Collapse tool calls,
Collapse turns (0.14) or Summary (0.13) chooses **Activity: use native rows (Collapse or
Summary)** in the Command Center; **Activity: use tool cards (Full display)** restores
the cards. The choice is per client, not saved, and
resets to cards whenever the plugin loads. It is a manual switch, not an automatic
runtime guard: the plugin never reads or changes the display preference. See
[Manual native-row switch](#manual-native-row-switch).

## Native bundle loading

An iOS client once reported `Cannot read property 'prototype' of undefined` while the
daemon catalog and logs still reported running/ready (beta.5 fix). The old entry eagerly
loaded Shiki, including class-based dependencies and HTML serialization code. A
try/catch inside the later tokenization call cannot catch a module-initialization
failure. The phone supplied no stack trace, so its exact failing `prototype`
expression is not established.

The replacement uses only the tokenization API of `prism-react-renderer@2.4.1`'s
non-global, function-based Prism. Its explicit ESM distribution avoids both neutral
package resolution and premature export snapshots from Paseo's CommonJS interop.
No global polyfill, DOM access, host patch or native highlighter disable switch is used.
Shell uses a small local grammar; this is not identical token classification to Shiki.

`tests/client-bundle.compat.test.js` builds the complete entry with the 0.16.0
compiler options (unchanged from 0.13.2), evaluates it from a string, registers/cleans
up contributions and exercises all supported grammars in Hermes. React Native 0.86.3 ships only the
`hermesc` compiler, not the Hermes VM, so the test runs the VM from React Native
0.81.5, an older and stricter engine. The beta.12 bundle also compiled with the
0.86.3 `hermesc`. Host UI/hooks and schema construction are stubbed in this test:
it does not prove on-device rendering. The other Node tests exercise real Zod validation.

## Why collapsed displays cannot safely fall back

In [0.16.0](https://github.com/getpaseo/paseo/tree/c54bc39e7997c03a07402c09df2e825889432557),
as in 0.13.2, `agent-stream/presentation.ts` applies plugin transformation before
tool-call grouping and turn folding. 0.14 replaces Summary with **Collapse tool calls**
and **Collapse turns** (the default for new installations):

- **Collapse tool calls** groups runs of two or more native tool calls and, unless
  reasoning auto-expands, the Thinking rows between them. Plugin rows are not
  groupable, so cards stay ungrouped and a plugin Thinking row would split a native group.
- **Collapse turns** folds a finished turn behind its starting user row, agent message
  or heartbeat, up to the turn's last native reply, and needs at least one native tool
  call or Thinking row as its work. Cards are not counted, so a turn whose only work is
  cards stays open; a turn with an earlier native reply still folds, and the cards before
  that reply fold with it.

`tests/paseo-host.compat.test.js` runs the unmodified pipeline in every display mode.
It verifies that every call is retained and documents both limits. Upstream [#8875](https://github.com/getpaseo/paseo/issues/8875) tracks
transformed tool/Thinking work and remains open. The separate plugin-reply fix
[#8811](https://github.com/getpaseo/paseo/pull/8811) ships in 0.16.0 and preserves
`sourceKind` so transformed assistant replies can anchor a fold. Tool/Thinking
cards still bypass work counting and grouping. The public transform
input, unchanged since 0.9, still has only the item and phase, no display mode, and a
transformer may return only plugin rows. This is not collapsed-display support.

The same pipeline applies native plan suppression after transformation. The plugin
passes `ExitPlanMode`, `plan_approval` and structured plan details through so that
native pending/rejected/completed plan handling remains intact in all modes.

Messages from other agents and heartbeats are tool calls that start turns. 0.14 shows
an agent message as a user-style "Sent by" row and folds the following turn behind it.
Paseo 0.16.0 includes `agentMessage` in transformer input. The plugin continues to recognise the
host envelope (name `agent_message` with a `paseo-agent-message:` call ID, or name
`heartbeat`) and leaves those rows native in every mode. Beta.13 turned them into
`agent_message` cards and kept those turns open.

The plugin therefore cannot recognise a host group or fold and preserve all its members.
It does not read private storage, inspect host DOM/React state, force the Full display
or patch the app.

## Manual native-row switch

The switch uses only public contributions: `addCommandCenterItem` and the cleanup
returned by `addTimelineTransformer`. Native rows unregister the `tool-calls` and
`reasoning` transformers; renderers and commands stay registered. Beta.9 to beta.13
kept the Thinking adapter, because 0.13 Summary never grouped reasoning. 0.14 groups
Thinking with tool calls, so a plugin Thinking row would split the native group into
lone calls. Selecting a command repeatedly never registers a duplicate transformer.

`presentation.ts` recomputes history when the transform function changes.
`tests/paseo-host.compat.test.js` runs that unmodified code: after switching one
presentation to native rows, existing history forms one group of the Thinking row and
both calls and turns fold again; switching back yields ungrouped cards. See
[verification](verification.md) for the live checks. A future public host API that
preserves groups or adds a detail-renderer slot is needed for real collapsed-display
support.

## Spacing and icons

The host adds 16px between plugin rows, versus zero inside native tool/Thinking
sequences. Native collapsed badges use a 22px icon slot plus 8px padding and 2px
borders, giving 32px center pitch with default text sizing. The host disables
standalone badge outer margins; do not count them again.

The native default label is 14px (`theme.fontSize.base`) with natural leading, and its
glyph is 12px. The plugin uses those sizes on both desktop and compact layouts, with a
flexible 16px minimum header and no vertical padding. The source-adapted browser
comparison measured 17px natural header height plus the host's 16px gap: **33px
pitch**, versus **32px all-native**. Earlier 13px-text desktop trials squeezed pitch to
30px while keeping a 44px compact minimum, producing an unwanted **60px mobile pitch**.
That mobile minimum is removed; desktop density is not pursued by reducing the native
font size or forcing a tight text line height.

Thinking remains a minimal disclosure with the original plain-text body, not the
former Markdown renderer. All layout stays in normal flow, with no negative
margins, translations or overlap compensation. First/last/footer gaps remain
host-owned and can be zero; native message-boundary spacing is not reproduced.

This is **visual density compatibility, not identical touch geometry**. A collapsed
header's pressable is only its natural height: it does not guarantee 44px and is
smaller than the native 32px badge. The plugin cannot make the host-owned gap
clickable through the public API; guessed hitSlop would not establish that. The
standalone Show all control retains its 44px compact minimum. Native-device tapping
and font scaling still need user validation. Larger text may grow the header; font
scaling is not disabled. The SDK exposes color tokens but not custom typography,
so comparison is against the native default rather than arbitrary host fonts.

Host Icon supports name, size and color, not a plugin stroke-width option. New host
releases need spacing and icon rechecks.

## Coexistence and lifecycle

Do not enable two plugins that replace the same tool-call or Thinking items. This fork uses the distinct default ID `readable-agent-activity`; existing installations may use an explicit runtime alias. Reload the existing alias rather than creating an enabled duplicate, and preserve disabled installations.

Contributions are unregistered during cleanup. Streaming/status updates preserve per-card manual disclosure while mounted; virtual-list remounts reset it. Native messages, approvals, composer and special `speak` rows remain with the host.
