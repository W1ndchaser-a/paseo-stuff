Math Renderer typesets block LaTeX formulas in completed assistant replies as images, with Show LaTeX and Copy LaTeX actions under each formula. It is an experimental beta and requires Paseo 0.9.0-beta.1 or newer on both the app and the daemon.

Rendering happens on the daemon host with MathJax and a bundled resvg WASM module, with no external rendering service. Replies stay native while streaming and formulas appear once the reply is complete.

**Limits:**

- Block math only. Inline math stays as source.
- Replies with tables, images or HTML stay entirely native, as do very large replies.
- Matching replies are drawn by the plugin's own simple Markdown renderer, so code highlighting, workspace file interactions and native text selection are not fully reproduced. Do not combine it with other plugins that replace assistant messages.
- Chat Find cannot search rendered formula replies. A Command Center action switches back to native replies for that.
- Its automated checks pass with the Paseo 0.11.2 SDK and it loads on a 0.11.2 daemon. Native iOS and Android are not accepted as tested.
