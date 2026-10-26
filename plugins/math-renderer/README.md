# Math Renderer for Paseo

Render **block and inline LaTeX inside assistant reply bodies**. Block formulas get one
muted English action row: **Show LaTeX** and **Copy LaTeX**. Inline formulas sit in the
text; tap one to see its source. No extra panel or duplicate message toolbar.

> **Experimental beta — 0.1.0-beta.6.** Requires Paseo app and daemon
> **0.9.0-beta.1 or newer**. Checked offline against Paseo 0.9.2 and 0.10.0-beta.1; the
> checks also pass with the 0.11.4 SDK. Beta.5 was tested live on a 0.12.0-beta.2 daemon
> in the hosted web client; the beta.6 npm package was loaded on a 0.12.0-beta.3 daemon
> and, from the registry, rendered on a 0.13.0 daemon in the 0.13.0 web client, whose SDK
> also passes the checks. Replies stay native while streaming; supported formulas
> render after completion. Native iOS/Android acceptance and complete native Markdown
> parity are not finished. Read the limitations before enabling this trusted plugin.

![Dark component preview of block math and English actions](images/math-dark.png)

*Synthetic React Native Web component preview, not a native mobile or live Paseo screenshot.*
[Light preview](images/math-light.png) · [Compact preview](images/math-compact.png)

## Install

Plugins run as trusted, unsandboxed code. Review the source, choose the target daemon,
and enable plugins in Paseo before installing. On Paseo 0.11 or later, install the
reviewed [registry](https://paseo.sh/plugins) entry `geoqiao/math-renderer`:

```sh
paseo plugin add geoqiao/math-renderer --host <host:port>
paseo --host <host:port> plugin ls
```

To install the published npm package directly:

```sh
paseo plugin add npm:paseo-math-renderer@0.1.0-beta.6 --host <host:port>
```

Paseo installs the package's runtime dependencies (MathJax and resvg) from its
`npm-shrinkwrap.json`. The package already contains the generated Markdown parser and
embedded WASM, so its manifest has no build steps. The `paseo-plugin.json` in the Git
source keeps them: they install the development dependencies, generate those files and
typecheck.

To install the pinned prerelease directly from Git instead:

```sh
paseo plugin add git:geoqiao/paseo-stuff:plugins/math-renderer --ref math-renderer-v0.1.0-beta.6 --host <host:port>
```

Paseo 0.11 reads a bare `owner/name` source as a registry ID, so the `git:` prefix is
required there. Paseo CLIs before 0.11 take the same Git source without the prefix.
If the registry install fails with "npm artifact changed since review", the daemon's
npm uses a registry mirror; see
[the fix](https://github.com/geoqiao/paseo-stuff#if-a-registry-install-fails-with-npm-artifact-changed-since-review).

The manifest ID is `math-renderer`. This directory is independently installable;
it does not import any sibling plugin or depend on root-installed packages.
For local development, run the checks below, then install this directory or reload
the existing runtime ID.

Beta.6 is published on npm. Beta.5 adds inline math. Beta.4 removes the `<0.10.0` upper bound so Paseo 0.10 prereleases can load the plugin,
and tests against Paseo 0.9.2 host sources. Beta.3 added 0.9 whole-message handling,
host external-link opening and a native-reply mode for chat Find. Beta.2 fixed mobile
bundle loading and added bold Greek symbols.
See [verification details](docs/verification.md#native-bundle-loading-fix-beta2)
for the reproduced Hermes error and the scope of the fix.

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
- Paragraphs, headings, emphasis, lists, quotes, ordinary code, and HTTP(S) Markdown links.
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

- **Most recent reply after a page reload:** in the 0.11.4 web client, the last reply
  of a reloaded agent stays native until the agent's next turn. Earlier replies render.
  The plugin cannot detect this case. The 0.12.0-beta.3 web client renders that reply
  ([getpaseo/paseo#7322](https://github.com/getpaseo/paseo/issues/7322)).
- Inline formulas are images, so a long formula does not wrap across lines.
  Punctuation after a formula is joined to it with an invisible U+2060 word joiner,
  which appears in copied text.
- Text such as `$x$5` (a digit right after the closing `$`) is not math; amounts
  written as `$5$` are typeset as the formula 5.
- The Paseo plugin SDK (0.9.0-beta.1 through 0.10.0-beta.1) does not expose the native
  Markdown renderer or math-node extensions.
  The plugin replaces supported source rows with its own small Markdown renderer;
  code highlighting, workspace-file interactions and native selection behavior are not fully reproduced.
- Tables, images, explicit HTML, non-HTTP(S) links, more than 64 formulas (block and
  inline) or more than 96,000 characters cause the entire completed source reply to remain native.
- **Chat Find:** in the 0.12.0-beta.3 web client, Find matches and highlights text in
  rendered replies, but not formula source such as `mc^2`. Paseo 0.9.0-beta.1 through
  0.11.4 cannot reliably jump to a match in a rendered reply. To search formula source,
  or on those versions, choose **Math: use native replies for chat Find** in the
  Command Center before Cmd/Ctrl+F.
  Choose **Math: render block formulas** afterwards. These actions affect this
  client's selected host, restore native rows without changing history, and reset
  to formula rendering when the plugin/client reloads. Other clients are unaffected.
- Local formula viewing state does not survive every virtualization unmount.
- MathJax base + AMS + boldsymbol only. `\boldsymbol{\mu}` and other bold math
  symbols are supported. Missing glyphs (including many non-Latin text glyphs),
  external resources, custom macros and unsupported commands fall back to source.
- Host foreground colors currently must be six-digit hex strings. Font size is clamped
  to 12–28 and image density to 1–3; other accessibility configurations need testing.
- PNG output has a LaTeX accessibility label and copy action, but is not semantic MathML
  and does not provide continuous mathematical text selection.
- Historical macOS Paseo 0.8.0 checks used actual model output. Native iOS/Android, other
  app/daemon versions, full desktop reconnect/disable cycles and sustained multi-client
  performance are **not** accepted as tested.
- The transformer only selects assistant messages and does not change tool display settings.
  Summary/Full detail behavior has pinned-source integration tests, not a complete
  live-App matrix of both modes and other plugins.

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

The 0.9 migration adds real pinned host presentation/identity/Find-model tests and
bundle lifecycle checks for both native-reply actions. Beta.4 pins those host sources
to Paseo v0.9.2 (identical in v0.10.0-beta.1) and passes the checks with the 0.9.2 and
0.10.0-beta.1 SDK packages, and with the 0.11.2 packages. Historical evidence follows;
see [verification details](docs/verification.md) for current checks and limits.

- Typecheck, lint and **57 automated tests** passed locally, including the complete
  client bundle evaluated in the RN 0.81.5 Hermes executable. Host UI/hooks and RPC
  contracts are stubbed in that engine test; on-device rendering remains unverified.
- Tests include real MathJax/resvg PNG output, malformed/oversized inputs, stable source-row
  identity using pinned Paseo 0.8.0 source, cleanup, and synthetic mixed-output regressions.
- Two real model replies contained 12 display formulas: 11 valid and one intentionally invalid.
  Their 18 recorded deltas reconstructed history exactly; backend replay produced 11 images
  and retained the invalid source. Selected rendering and failure cases were inspected in the App.
- Nine separate browser interaction groups passed using actual plugin components and the
  real local renderer, including exact LaTeX copy, English/muted single-row actions, source
  state, light/dark themes, 390px overflow, streaming completion and simulated transport failure.
  These browser checks are **not** native mobile acceptance.
- Publication-time production dependency audit reported zero known advisories; this is
  a point-in-time result, not a security guarantee.

See [verification details](docs/verification.md) and the repository's CI results.

## License

Plugin-authored code is MIT. Third-party code, glyphs, WASM and pinned host fixtures
retain their licenses. See [THIRD_PARTY.md](THIRD_PARTY.md), `third-party/`, and the fixture LICENSE.
