Math Renderer typesets block and inline LaTeX formulas in completed assistant replies as images. Block formulas have Show LaTeX and Copy LaTeX actions; tapping an inline formula shows its source. It is an experimental beta and requires Paseo 0.9.0-beta.1 or newer on both the app and the daemon.

Rendering happens on the daemon host with MathJax and a bundled resvg WASM module, with no external rendering service. Replies stay native while streaming and formulas appear once the reply is complete.

**Limits:**

- In the Paseo 0.11 web client, the most recent reply stays native after a page reload until the next turn, because Paseo reports it as still streaming.
- Replies with tables, images or HTML stay entirely native, as do very large replies.
- Matching replies are drawn by the plugin's own simple Markdown renderer, so code highlighting, workspace file interactions and native text selection are not fully reproduced. Do not combine it with other plugins that replace assistant messages.
- Chat Find cannot search formula source. Before Paseo 0.12 it also cannot reliably jump into rendered replies. A Command Center action switches back to native replies for that.
- Its automated checks pass with the Paseo 0.11.4 SDK, and beta.5 was tested live on a 0.12.0-beta.2 daemon in the hosted web client. Native iOS and Android are not accepted as tested.
