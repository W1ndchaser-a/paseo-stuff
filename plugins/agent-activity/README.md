# Readable Agent Activity

**Formatted, highlighted tool-call JSON. Twenty-line previews. Recognizable tool icons.**

**Version 0.1.0-beta.11** · [Release notes](CHANGELOG.md) · Paseo 0.8 or later, checked through SDK 0.11.4. Tool cards need Full detail;
a Command Center action switches to native tool rows for Summary.

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
stay native. The plugin does not generate summaries, infer nested calls, rebuild
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

**Paseo 0.8.0 or later · tool cards need Full detail · experimental beta.**
Beta.9 passes its checks with SDK 0.9.2, 0.10.1 and 0.11.2 and pinned 0.8.0/0.9.2 host
fixtures; beta.11 also passes with SDK 0.13.0. Beta.11, installed from the registry,
rendered tool cards live on a 0.13.0 daemon in the 0.13.0 web client. Beta.8 rendered live on a 0.10.0-beta.1 daemon in the hosted web client with
Full detail. The manifest sets
only a minimum, `>=0.8.0`, as Paseo recommends; later releases are not tested.

Paseo 0.8 groups Summary calls before running plugin transformers. Its public API
exposes neither the display mode nor group members. An enabled replacement can
hide the native group's entry point; this plugin cannot automatically fall back.

Paseo 0.9 and 0.10.0-beta.1 transform each original call **before** Summary grouping.
All calls now remain visible, but plugin cards bypass grouping. Native plan/approval
tools pass through, preserving host suppression and expandable plan cards. No
display-mode API is available in any tested version, so the plugin cannot switch by itself.

### Switching between cards and native rows

Open the Command Center on the client you are using and choose:

- **Activity: use native tool rows (for Summary)** before selecting Summary. Tool calls
  return to native rows, so Summary groups them again; Thinking keeps its compact row.
- **Activity: use tool cards (Full detail)** to restore the cards.

The choice applies only to that client and is not saved: tool cards return whenever
the plugin loads again, for example after an app reload. Switch each client separately.
The plugin does not detect or change the host display preference and does not inspect
private app state. With cards active, Summary shows every call ungrouped on 0.9+ and
can hide the group entry on 0.8. Do not enable two plugins replacing the same
tool-call timeline items.

Pinned 0.9.2 host-pipeline tests show that native rows regroup existing history and
that cards come back ungrouped. On a live 0.10.1 daemon in the hosted web client, the
commands regrouped an existing conversation in Summary and restored the cards.
0.8 re-rendering after a switch is untested; reload the conversation if rows do not
change. Hermes engine tests and compact browser previews are not on-device mobile
UI tests. [Compatibility evidence](docs/compatibility.md).

## Install and local development

Plugins are **trusted, unsandboxed code**. This plugin is client-only and uses public
SDK modules, React Native primitives and host theme colors. It has no runtime network,
filesystem, process or daemon-side behavior. Contributions unregister on cleanup.

On Paseo 0.11 or later, install the reviewed [registry](https://paseo.sh/plugins) entry on
the intended daemon. Its registry ID is `geoqiao/agent-activity`; the installed plugin ID
stays `readable-agent-activity`:

```sh
paseo plugin add geoqiao/agent-activity --host <your-host>
```

To install the published npm package directly:

```sh
paseo plugin add npm:paseo-readable-agent-activity@0.1.0-beta.11 --host <your-host>
```

Paseo installs the package's two runtime dependencies, `prism-react-renderer` and
`@getpaseo/protocol`, from its `npm-shrinkwrap.json`; both are compiled into the
client bundle. The package's manifest has no build steps. The `paseo-plugin.json` in
the Git source keeps them: they install the development dependencies and run the checks.

To install the pinned prerelease directly from Git instead:

```sh
paseo plugin add git:geoqiao/paseo-stuff:plugins/agent-activity --ref readable-agent-activity-v0.1.0-beta.11 --host <your-host>
```

Paseo 0.11 reads a bare `owner/name` source as a registry ID, so the `git:` prefix is
required there. Paseo CLIs before 0.11 take the same Git source without the prefix.
If the registry install fails with "npm artifact changed since review", the daemon's
npm uses a registry mirror; see
[the fix](https://github.com/geoqiao/paseo-stuff#if-a-registry-install-fails-with-npm-artifact-changed-since-review).

Installation enables the plugin with tool cards active. Review its source/trust
requirements, then use Full detail or switch to native tool rows first. Do not create a duplicate installation. Existing installations
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
