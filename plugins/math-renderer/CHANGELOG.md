# Changelog

## 0.1.0-beta.5 — 2026-10-18

- Typeset inline math. `\(...\)` and `$...$` inside paragraphs, headings, lists and quotes render as formula images on the text baseline. Tap a formula to see its LaTeX source; tap the source to switch back.
- Keep prices as text. Like Pandoc, `$` needs no space just inside either delimiter and no digit right after the closing `$`, so `$5 and $10` stays text. `\[...\]` and `$$...$$` in the middle of a paragraph and unclosed delimiters still keep their source.
- Keep punctuation after an inline formula on the formula's line. The plugin puts an invisible word joiner (U+2060) before the punctuation, so copied text contains that character.
- Raise the per-reply formula limit from 32 to 64, counting inline formulas. The render RPC now takes `display` and returns the image's depth below the baseline.
- Live-tested on a Paseo 0.12.0-beta.2 daemon with the hosted 0.11.4 web client and the 0.12.0-beta.3 web client. `npm run check` passes with the 0.9.2 and 0.11.4 packages. In the 0.11.4 web client, the most recent reply stays native after a page reload until the next turn; see the README limitations. In the 0.12.0-beta.3 web client, chat Find matches text in rendered replies.

## 0.1.0-beta.4 — 2026-09-28

- Require Paseo 0.9.0-beta.1 or newer (`>=0.9.0-beta.1`). The previous `<0.10.0` bound made the Paseo 0.10.0-beta.1 daemon reject the plugin. No newer API is adopted, so the minimum is unchanged.
- Build and test against the exact 0.9.2 SDK, client and protocol packages. The same checks also pass with the 0.10.0-beta.1 packages.
- Refresh the pinned host presentation, Markdown splitting and chat Find fixtures to Paseo v0.9.2, which are identical in v0.10.0-beta.1. The host now splits native history replies into Markdown block rows; tests assert that unsupported replies stay native and that native-reply mode resolves chat Find targets through the host message identity. Rendered formula rows still cannot be found.
- Loaded on a live 0.10.0-beta.1 daemon: the hosted web client rendered a block formula, and chat Find worked in native-reply mode. The desktop app and mobile remain unverified.

## 0.1.0-beta.3 — 2026-09-18

- Target Paseo 0.9.0-beta.1 and the 0.9 SDK. Keep streaming replies native and render supported whole replies after completion, avoiding repeated parsing and mid-stream ownership changes.
- Add client-local Command Center actions to restore native replies for chat Find and re-enable block formula rendering. Do not mutate history or host preferences.
- Open HTTP(S) links through the public host `openExternalUrl` API.
- Add pinned 0.9 host fixtures and regression coverage for mixed/oversized whole-message fallback, stable history identity, native tool modes and the remaining Find identity gap.
- Retain all parser, TeX and rendering bounds. Unsupported whole replies remain native; inline math and full native Markdown parity remain outside this beta.

## 0.1.0-beta.2

- Enable MathJax's bundled boldsymbol extension so valid formulas containing
  bold Greek symbols render, including the multivariate normal density.
- Fix the mobile startup error `Cannot read property 'prototype' of undefined`
  reproduced in Hermes while loading the Markdown parser's entity decoder.
- Prepare the pinned parser as function-based JavaScript with an ESM wrapper;
  generate it during installation and CI without committing compiled artifacts.
- Test complete client-bundle loading, streaming Markdown, fallback and cleanup
  in Node and the RN Hermes executable. On-device UI acceptance remains outstanding.

## 0.1.0-beta.1

First public experimental release, targeting Paseo 0.8.0.

- Render closed display-math delimiters and math fences in assistant reply bodies.
- Use local MathJax and embedded resvg WASM to produce PNGs for React Native.
- Preserve surrounding supported Markdown, incomplete source, and invalid formulas.
- Keep one muted English action row per formula: Show LaTeX and Copy LaTeX.
- Preserve manual source viewing across text/theme updates while mounted.
- Normalize one redundant display-delimiter pair inside math fences.
- Let the host derive unique source-relative replacement IDs for split reply rows.
- Include bounded rendering, source fallback, explicit retry and lifecycle cleanup.

This is block math only. Inline math, complete native Markdown parity, native mobile
acceptance and sustained resource stress testing are not complete. See README.md.
