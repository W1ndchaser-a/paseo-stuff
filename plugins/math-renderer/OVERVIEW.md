Math Renderer typesets block and inline LaTeX formulas in completed assistant replies as images. Block formulas have Show LaTeX and Copy LaTeX actions; tapping an inline formula shows its source. It is an experimental beta and requires Paseo 0.13.0 or newer on both the app and the daemon.

Rendering happens on the daemon host with MathJax and a bundled resvg WASM module, with no external rendering service. Replies stay native while streaming and formulas appear once the reply is complete. Parts of a reply without a formula, such as tables, images and code, keep Paseo's own Markdown rendering.

**Limits:**

- Paragraphs, lists and quotes that contain a formula are drawn by the plugin's own simple Markdown renderer, so code highlighting, workspace file links and native text selection are not reproduced there. Do not combine it with other plugins that replace assistant messages.
- An image, table or HTML inside a paragraph or list that also contains a formula keeps the whole reply native, as do very large replies.
- Chat Find finds text in rendered replies but not formula source. A Command Center action switches back to native replies for that.
- Paseo 0.16.0 folds completed formula replies under Collapse turns. On Paseo 0.14 through 0.15.4, use native-reply mode to fold those turns. Native-reply mode also lets chat Find search formula source.
- Automated checks pass with the Paseo 0.13.2 and 0.16.0 SDKs and the 0.16.0 host presentation pipeline in all three chat display modes. The packed plugin also loaded on an isolated macOS 0.15.3 daemon. Its last live web-client check used a Paseo 0.14.0 daemon and web client. The desktop app and native iOS and Android are not accepted as tested.
