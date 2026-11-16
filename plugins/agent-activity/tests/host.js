import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";

// Bundle only unmodified host test fixtures. No production code imports internals.
// The pinned SDK's protocol predates the host's turn helpers, so the fixtures
// resolve @getpaseo/protocol to the target release (devDependency paseo-host-protocol).
const fixtures = fileURLToPath(new URL("./fixtures/paseo-0.16.0", import.meta.url));
const code = buildSync({
  stdin: { contents: 'export * from "./agent-stream/presentation"; export * from "./plugins/timeline/model";', resolveDir: fixtures },
  bundle: true, format: "cjs", platform: "node", target: "node22",
  alias: { "@": fixtures, "@getpaseo/protocol": "paseo-host-protocol" }, write: false,
}).outputFiles[0].text;
const module = { exports: {} };
runInThisContext("(function(require, module, exports) {\n" + code + "\n})")(createRequire(import.meta.url), module, module.exports);
export const { createStreamPresentation, transformTimelineItem } = module.exports;
