DeepSeek Harness provides two Paseo entries: **DSH · 日常** for ordinary coding and **DSH · 逆向** for the full REA tool catalog. The reverse entry keeps the existing `deepseek-harness` identity and `acp` profile, so existing sessions are not moved. The daily entry uses `deepseek-harness-daily` and `acp-daily`. The selected DSH profile controls which MCP tools start.

DSH and both profiles must already be configured on the daemon machine. The plugin requires Paseo 0.15.3 or newer and daemon Node.js 22.19.0 or newer; DSH's separate runtime requirements still apply. It starts the configured DSH command under the daemon user's account and preserves that session's environment, model route and working directory. It adds no sandbox or permission override.

On resume, the plugin streams DSH's native session store rather than rebuilding all history in memory. Tool calls need a recorded result before they appear completed. Missing or corrupt history produces a visible warning without replacing the original session. Internal runtime/skill instructions are not displayed as user messages.

Restored images appear as compact cards. Opening a card reads only that image from the selected DSH home and verifies its content hash; image bytes are not embedded into every timeline update. File references keep their server location. The replay layer reads local transcripts and attachments but does not upload them to any external service.

The existing Usage source still reports DeepSeek's official API balance when its key is configured; it is not CPA usage reporting. Provider slash commands and other unsupported DSH ACP surfaces remain unavailable.

This version was verified with DSH 0.2.2-rc.1 and Paseo 0.15.3 on Linux: real Bash and image-model turns, resume, missing-image warnings, desktop-width and compact dark web rendering. Native iOS/Android and Windows were not exercised.
