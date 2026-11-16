# Readable Agent Activity

**Formatted, highlighted tool-call JSON. Twenty-line previews. Recognizable tool icons.**

**Version 0.1.0-beta.14** · [Release notes](CHANGELOG.md) · Paseo 0.13 or later, checked on 0.16.0. Tool cards need the Full
chat display; a Command Center action switches to native rows for Collapse tool calls, Collapse turns or Summary.

## What it does

- One **Input / Output** view for ordinary tools and codex-conversion.
- Format and syntax-highlight JSON. Non-JSON text stays readable; source-only
  JavaScript inputs render in place.
- Preview at most **20 displayed lines per section**, including automatic wrapping. One **Show all / Show less**
  control expands or collapses both sections. No Raw/Copy toolbar or extra explanations.
- Keep tool-specific icons and the host's running/failed/canceled status.
- Show the call's own main argument after the tool name on the collapsed header,
  such as the shell command or file path: one literal value, first line only, in
  muted monospace. It gives way before the tool name on narrow layouts.
- Keep expansion manual through streaming and theme updates. Text is selectable
  with real newline characters for normal device copying.

Thinking uses a minimal matching foldable header to keep alternating tool/Thinking
rows compact. Its body is selectable original text, with twenty-line preview and
Show all, **without Markdown interpretation**. Messages, approvals and the composer
stay native. Messages from other agents and heartbeats keep the host's own rows, so
they start and fold turns as usual. The plugin does not generate summaries, infer nested calls, rebuild
diffs or add settings screens.

## Before and after

Each pair uses **the same synthetic input and output**: original Paseo 0.8.0 reference
on the left, this plugin on the right. These are real renderer components in a browser
preview, not app/device captures. [Screenshot provenance and limits](docs/screenshots.md).

### Formatted, highlighted JSON

A serialized JSON result becomes an indented, colored structure.

![Original Paseo JSON output versus Activity's formatted and highlighted JSON](images/01-json-comparison.png)

### Source code without the JSON wrapper

A source-only exec input displays as code; a pure text result displays its JSON content.
Extra metadata and attachment fields are preserved when present.

![Original exec input and output wrappers versus Activity's code and JSON view](images/02-code-comparison.png)

### Twenty-line preview for long output

Non-JSON output stays plain text. Activity shows the first twenty lines and offers
one Show all for the complete result; wrapped long lines are bounded too.

![The same sixty-line output in original Paseo and Activity's twenty-line preview](images/03-preview-comparison.png)

## Data and limits

JSON strings are formatted by changing whitespace only: number spellings, duplicate
keys, key order and escapes remain intact. Structured objects are already decoded data.

Only a source-only code input and a pure single-text content envelope are unwrapped.
Extra input parameters, metadata, traces, unknown blocks and attachment data remain
visible in the formatted JSON. Arbitrary nested strings are not recursively decoded.
Native typed details receive a thin Input/Output adaptation; supplied edit fields
are retained, not replaced with a reconstructed diff.

**Show all displays the complete received representation**, not an inferred summary.
It cannot restore data already omitted upstream. The preview first takes twenty source
lines, then clips wrapping to twenty line-heights. It is not independently scrollable;
Show all removes both limits. There is no additional 4,000-character preview cap.

Formatting work is capped at 1,000,000 input/output characters, with bounded indentation;
larger or malformed text remains intact as literal text. Highlighting is capped at
100,000 characters. Source serialization, long-line layout and Show all can still be expensive for
large payloads, particularly a single very long line. This is not a zero-lag guarantee.
Virtual-list remounts reset local disclosure state.

[Conversion compatibility](docs/conversion-compatibility.md) · [Verification](docs/verification.md)

## Compatibility

**Paseo 0.13.0 or later · tool cards need the Full chat display · experimental beta.**
It requires 0.13.0 and pins the 0.13.2 SDK; its checks also pass with the 0.16.0 SDK,
and its host tests run on unmodified 0.16.0 sources. The last live web-client check
used a 0.14.0 daemon and web client under all three chat display modes. See
[verification](docs/verification.md) for the separate 0.16.0 checks. The manifest sets
only a minimum, `>=0.13.0`, as Paseo recommends; releases after 0.16.0 are not tested.
For Paseo 0.8 to 0.12, keep beta.11.

Paseo transforms each original call **before** grouping and turn folding. All calls
remain visible, but plugin cards bypass grouping. In Paseo 0.14 through 0.16.0,
**Collapse turns** (the default for new installations) counts only native tool calls
and Thinking rows as a turn's work. A
turn whose only output is cards and one reply therefore stays open. A turn with an
earlier reply still folds, and its cards fold with it. Native plan/approval tools,
messages from other agents and heartbeats pass through, preserving host suppression,
expandable plan cards, user-style agent-message rows and turn boundaries. Paseo
0.16.0 still has no display-mode API for plugins, so the plugin cannot switch by itself.
The transformed-work folding bug is tracked in upstream
[#8875](https://github.com/getpaseo/paseo/issues/8875), which is still open. The separate
plugin-reply fix [#8811](https://github.com/getpaseo/paseo/pull/8811) ships in 0.16.0; it does not resolve transformed tool/Thinking work.

### Switching between cards and native rows

Open the Command Center on the client you are using and choose:

- **Activity: use native rows (Collapse or Summary)** before selecting Collapse tool
  calls, Collapse turns (Paseo 0.14) or Summary (Paseo 0.13). Tool calls and Thinking
  return to native rows, so the host groups them and folds turns again. Since 0.14 the
  host groups Thinking with tool calls, so a plugin Thinking row would split the group.
- **Activity: use tool cards (Full display)** to restore the cards and Thinking rows.

The choice applies only to that client and is not saved: tool cards return whenever
the plugin loads again, for example after an app reload. Switch each client separately.
The plugin does not detect or change the host display preference and does not inspect
private app state. With cards active, collapsed displays show every call ungrouped. Do not
enable two plugins replacing the same tool-call timeline items.

Pinned 0.16.0 host-pipeline tests cover Full, Collapse tool calls and Collapse turns:
native rows regroup existing history and fold turns, cards come back ungrouped, and
agent-message and heartbeat rows match the host's own presentation. Hermes engine tests and compact browser previews are
not on-device mobile UI tests. [Compatibility evidence](docs/compatibility.md).

## Install and local development

Plugins are **trusted, unsandboxed code**. This plugin is client-only and uses public
SDK modules, React Native primitives and host theme colors. It has no runtime network,
filesystem, process or daemon-side behavior. Contributions unregister on cleanup.

Install the reviewed [registry](https://paseo.sh/plugins) entry on the intended daemon. Its registry ID is `geoqiao/agent-activity`; the installed plugin ID
stays `readable-agent-activity`:

```sh
paseo plugin add geoqiao/agent-activity --host <your-host>
```

To install the published npm package directly:

```sh
paseo plugin add npm:paseo-readable-agent-activity@0.1.0-beta.14 --host <your-host>
```

Paseo installs the package's two runtime dependencies, `prism-react-renderer` and
`@getpaseo/protocol`, from its `npm-shrinkwrap.json`; both are compiled into the
client bundle. The package's manifest has no build steps. The `paseo-plugin.json` in
the Git source keeps them: they install the development dependencies and run the checks.

To install the pinned prerelease directly from Git instead:

```sh
paseo plugin add git:geoqiao/paseo-stuff:plugins/agent-activity --ref readable-agent-activity-v0.1.0-beta.14 --host <your-host>
```

Paseo reads a bare `owner/name` source as a registry ID, so the `git:` prefix is
required. If the registry install fails with "npm artifact changed since review", the daemon's
npm uses a registry mirror; see
[the fix](https://github.com/geoqiao/paseo-stuff#if-a-registry-install-fails-with-npm-artifact-changed-since-review).

Installation enables the plugin with tool cards active. Review its source/trust
requirements, then use the Full chat display or switch to native rows first. Do not create a duplicate installation. Existing installations
may use a runtime alias such as `colorful-agent-activity`; manage that existing ID.
[Repository migration notes](https://github.com/geoqiao/paseo-stuff/blob/main/MIGRATION.md).

For local development, run from the plugin directory (Node.js 22+):

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
npm run check
# Only if the existing installation is enabled:
paseo plugin reload <existing-runtime-id> --host <your-host>
paseo plugin ls --host <your-host>
```

Preserve disabled installations; do not auto-enable them. No daemon restart is needed.
Tests cover formatter fidelity, malformed/large data, complete output, text selection,
manual disclosure, streaming, icons, theme colors, the Hermes bundle and pinned host
projection. Native iOS/Android UI and the complete reconnect matrix remain unverified.

## Credits

An MIT fork of Matt Cowger's [Colorful Agent Activity](https://github.com/mcowger/paseo-plugins/tree/91058be73840ae11b130b6bb7d34b07652462217/colorful-agent-activity).
Original copyright retained: [LICENSE](LICENSE), [provenance](UPSTREAM.md).
Vendored Paseo test fixtures retain their separate Apache-2.0 license.

The three comparison images show beta.6. Earlier screenshots remain in historical release tags.
Published on npm as `paseo-readable-agent-activity` from 0.1.0-beta.11.
[paseo.cafe submission and migration status](docs/catalog.md).
