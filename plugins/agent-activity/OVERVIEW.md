Readable Agent Activity replaces Paseo's tool-call rows with expandable cards that show Input and Output as formatted, syntax-highlighted JSON, and gives Thinking rows a matching compact header. Long output is previewed at twenty lines, with Show all to expand it. Messages, approvals and the composer stay native.

Use the cards with Full detail. They bypass Summary grouping, so before switching to Summary, run "Activity: use native tool rows (for Summary)" from the Command Center on that client, and "Activity: use tool cards (Full detail)" to switch back. The choice applies to that client only and resets to cards whenever the plugin reloads. On Paseo 0.8, cards shown in Summary can hide the native group entry.

The plugin runs entirely on the client and reformats data Paseo already received, without summarizing or rebuilding diffs. It has no network, filesystem, process or daemon-side behavior. Show all on a very large payload can be slow.

Do not enable it next to another plugin that replaces tool-call or Thinking timeline items. It requires Paseo 0.8.0 or later. Its automated checks pass with the Paseo 0.11.2 SDK, and it was last exercised live on a 0.10.1 daemon in the hosted web client. The Paseo desktop app and native iOS and Android are untested. It is a fork of Matt Cowger's Colorful Agent Activity.
