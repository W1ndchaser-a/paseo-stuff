# Math Renderer for Paseo

Render **block and inline LaTeX inside assistant reply bodies**. Block formulas get one
muted English action row: **Show LaTeX** and **Copy LaTeX**. Inline formulas sit in the
text; tap one to see its source. No extra panel or duplicate message toolbar.

> **Experimental beta, 0.1.0-beta.8.** Requires Paseo app and daemon **0.13.0 or newer**
> and is checked against Paseo 0.16.0. Older Paseo releases are not supported; on Paseo
> 0.9 to 0.12, keep [0.1.0-beta.6](https://www.npmjs.com/package/paseo-math-renderer/v/0.1.0-beta.6).
> Replies stay native while streaming; supported formulas render after completion, and
> every block without a formula keeps the host's own Markdown rendering. Native iOS/Android
> acceptance is not finished. Read the limitations before enabling this trusted plugin.

![Dark component preview of block math and English actions](images/math-dark.png)

*Synthetic React Native Web component preview from an earlier beta, not a native mobile or live Paseo screenshot.*
[Light preview](images/math-light.png) · [Compact preview](images/math-compact.png)

## Install

Plugins run as trusted, unsandboxed code. Review the source, choose the target daemon,
and enable plugins in Paseo before installing. Install the
reviewed [registry](https://paseo.sh/plugins) entry `geoqiao/math-renderer`:

```sh
paseo plugin add geoqiao/math-renderer --host <host:port>
paseo --host <host:port> plugin ls
```

To install the published npm package directly:

```sh
paseo plugin add npm:paseo-math-renderer@0.1.0-beta.8 --host <host:port>
```

Paseo installs the package's runtime dependencies (MathJax and resvg) from its
`npm-shrinkwrap.json`. The package already contains the generated Markdown parser and
embedded WASM, so its manifest has no build steps. The `paseo-plugin.json` in the Git
source keeps them: they install the development dependencies, generate those files and
typecheck.

To install the pinned prerelease directly from Git instead:

```sh
paseo plugin add git:geoqiao/paseo-stuff:plugins/math-renderer --ref math-renderer-v0.1.0-beta.8 --host <host:port>
```

Paseo reads a bare `owner/name` source as a registry ID, so the `git:` prefix is
required. If the registry install fails with "npm artifact changed since review", the daemon's
npm uses a registry mirror; see
[the fix](https://github.com/geoqiao/paseo-stuff#if-a-registry-install-fails-with-npm-artifact-changed-since-review).

The manifest ID is `math-renderer`. This directory is independently installable;
it does not import any sibling plugin or depend on root-installed packages.
For local development, run the checks below, then install this directory or reload
the existing runtime ID.

Beta.7 requires Paseo 0.13 and hands formula-free blocks to the host Markdown
renderer. Beta.6 is published on npm. Beta.5 adds inline math. Beta.2 fixed mobile
bundle loading and added bold Greek symbols.
See [verification details](docs/verification.md) for each release.

If you used the earlier local prototype alias `paseo-math-renderer-prototype`, keep
that installation's ID for reload/disable. Do not enable a second copy alongside it.
Likewise, avoid overlapping assistant-message replacement plugins.

## Supported content

- Closed display-math blocks: `$$...$$` and `\[...\]`, with delimiters occupying their own lines
  or the entire block on one line.
- Closed fenced `math` blocks, including one redundant outer display-delimiter pair.
- Inline math: `\(...\)` and `$...$` inside paragraphs, headings, lists and quotes.
  A `$` formula needs no space just inside either delimiter and no digit right after
  the closing `$`, so `costs $5 and $10` stays text. Write `\(...\)` when the
  formula must start or end with a space. `$$...$$` or `\[...\]` in the middle of a
  paragraph and unclosed delimiters keep their source.
- Tap an inline formula to see its LaTeX source, and tap the source to switch back.
- Top-level blocks without a formula, such as tables, images, code, file links, HTML and
  reference links, use the host `Markdown` component from the plugin SDK, so they look and
  behave like native replies.
- A top-level block that contains a formula (a paragraph, heading, list or quote) is drawn
  by the plugin with paragraphs, headings, emphasis, lists, quotes, ordinary code and
  HTTP(S) links, so an ordered list keeps its numbering.
- Streaming replies use Paseo's native Markdown renderer. Supported formulas are
  typeset when the whole reply completes, avoiding repeated full-document parsing
  and mid-stream fallback when an image, file link or size limit appears later.
- Invalid or unsupported TeX retains its source; transport/render failures offer **Retry**.
- **Show LaTeX** changes to **Show formula** while viewing source. Manual viewing survives
  text and theme updates while the card remains mounted.
- Long equations scroll horizontally. Colors follow the host theme; compact actions have
  44-pixel minimum height.

Example prompt for a model:

```text
Explain the quadratic formula in English. Mix normal Markdown paragraphs, a list and
a quotation with display formulas. Put display delimiters on their own lines. Include
a Gaussian integral, a matrix in a math fence, and an aligned three-line derivation.
Include a Python code block with the string "$$not_math$$". End with a valid formula
after a deliberately invalid \badUnknownCommand{1} display formula. Do not use tools
or wrap the entire reply in a code fence.
```

## Limitations

- Inline formulas are images, so a long formula does not wrap across lines.
  Punctuation after a formula is joined to it with an invisible U+2060 word joiner,
  which appears in copied text.
- Text such as `$x$5` (a digit right after the closing `$`) is not math; amounts
  written as `$5$` are typeset as the formula 5.
- The Paseo plugin SDK exposes the host Markdown renderer only for whole strings, with no
  math extension. Blocks that contain a formula use the plugin's own small renderer, so
  code highlighting, workspace-file links and native selection are not reproduced there.
- An image, table, file link, HTML or non-HTTP(S) link inside a block that also contains a
  formula, more than 64 formulas (block and inline) or more than 96,000 characters keep
  the entire completed reply native.
- **Chat Find:** in the 0.13.2 and 0.14.0 web clients, Find matches and highlights text in rendered
  replies, but not formula source such as `mc^2`. To search formula source, choose
  **Math: use native replies to search formula source** in the Command Center before
  Cmd/Ctrl+F. Choose **Math: render formulas** afterwards. These actions affect this
  client's selected host, restore native rows without changing history, and reset
  to formula rendering when the plugin/client reloads. Other clients are unaffected.
- **Collapse turns:** Paseo 0.16.0 preserves the original reply kind when a plugin
  renders it, so completed formula replies fold normally. This is verified against
  the released host pipeline, including turns with an earlier plain-text reply.
  On Paseo 0.14 through 0.15.4, use native-reply mode to fold formula replies.
  Native-reply mode also remains available for searching formula source with chat Find.
  Activity's separate transformed-work issue [#8875](https://github.com/getpaseo/paseo/issues/8875) remains open.
- Local formula viewing state does not survive every virtualization unmount.
- MathJax base + AMS + boldsymbol only. `\boldsymbol{\mu}` and other bold math
  symbols are supported. Missing glyphs (including many non-Latin text glyphs),
  external resources, custom macros and unsupported commands fall back to source.
- Host foreground colors currently must be six-digit hex strings. Font size is clamped
  to 12–28 and image density to 1–3; other accessibility configurations need testing.
- PNG output has a LaTeX accessibility label and copy action, but is not semantic MathML
  and does not provide continuous mathematical text selection.
- Native iOS/Android, the desktop app, full reconnect/disable cycles and sustained
  multi-client performance are **not** accepted as tested.
- The transformer only selects assistant messages and does not change tool display settings.
  Full, Collapse tool calls and Collapse turns have pinned 0.16.0 source integration tests
  and a previous live 0.14.0 web check, not a complete live-App matrix of every mode and other plugins.

## Rendering and trust

Formula text goes through the existing Paseo plugin RPC to MathJax on the daemon machine.
MathJax produces self-contained SVG glyph paths; bundled resvg WASM rasterizes them into
PNG data URIs. The client renders ordinary React Native images, text and scroll views.

No external math service, font URL, system-font scan, runtime filesystem access, shell
process or extra HTTP listener is used by the renderer. This is not a promise that
Paseo's trusted plugin environment is a security sandbox.

Limits include 96,000 characters / 64 formulas per complete source reply, 4,096 characters per formula,
bounded TeX commands/nesting/rows, 2,400×800 logical pixels / 4 million raster pixels,
1 MB SVG/PNG, 128 cache entries / 8 MB of image URIs, and at most 16 pending renders.
These are **not a hard CPU timeout or a strict memory sandbox**. Use trusted inputs;
adversarial/high-concurrency load remains a beta risk.

Cleanup unregisters contributions, clears the cache and releases MathJax resources.
The host terminates the plugin subprocess to reclaim its WASM memory.
MathJax 3 is deliberately pinned for self-contained, synchronous glyph output;
migration to MathJax 4 is a separate maintenance task.

## Development

From this directory:

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
npm run prepare:markdown
npm run prepare:wasm
npm run check
```

`prepare:markdown` lowers the pinned Markdown parser to function-based JavaScript
and wraps it as ESM in ignored `shared/generated/` for Hermes compatibility.
`prepare:wasm` embeds the unmodified npm resvg WASM artifact into ignored
`server/generated/wasm.ts`. The Git manifest runs both build steps during installation;
`npm pack` runs them too and ships the generated files in the npm package.
Do not commit generated files, dependencies or compiled bundles.

Typecheck before reloading the exact installed ID on the intended host. Do not restart
the daemon or auto-enable a disabled installation.

## Verification

`npm run check` runs the typecheck, lint and tests. The tests cover real MathJax/resvg
PNG output, malformed and oversized input, how replies split into host Markdown and
plugin blocks, and the complete client bundle evaluated in the RN 0.81.5 Hermes
executable. Host presentation, plugin projection, tool grouping and the chat Find
model come from unmodified Paseo v0.16.0 sources, and they run in all three current chat
display modes. The checks pass with the pinned 0.13.2 SDK and with the 0.16.0 SDK. The
beta.7 bundle also compiles with the RN 0.86.3 `hermesc` used by Paseo 0.13.2 and 0.14.0.

Beta.7 was checked live on a Paseo 0.13.2 daemon in the 0.13.2 web client, including
chat Find, dark mode and a 390-pixel layout. Beta.8 was checked live on a Paseo 0.14.0
daemon in the 0.14.0 web client under Collapse turns, including native-reply mode. See
[verification details](docs/verification.md) for the exact scope and limits.

## License

Plugin-authored code is MIT. Third-party code, glyphs, WASM and pinned host fixtures
retain their licenses. See [THIRD_PARTY.md](THIRD_PARTY.md), `third-party/`, and the fixture LICENSE.
