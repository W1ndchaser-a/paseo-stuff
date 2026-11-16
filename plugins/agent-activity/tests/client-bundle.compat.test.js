import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hermesPlatform = { darwin: "osx-bin", linux: "linux64-bin", win32: "win64-bin" }[process.platform];
const hermes = process.env.HERMES_BIN || join(root, "node_modules/react-native/sdks/hermesc", hermesPlatform || "unsupported", process.platform === "win32" ? "hermes.exe" : "hermes");

// Match Paseo v0.16.0 compiler-build.ts (same options as 0.13.2): neutral + ES2020 with
// module/main fields, lowered async and eager CJS interop, then evaluate the wrapped bundle
// from a string (no Metro/Babel pass).
// https://github.com/getpaseo/paseo/blob/8c6de842a3157530c26a7a94c78a3d647fb96ce9/packages/server/src/server/plugins/compiler-build.ts
async function bundle(entry) {
  const result = await build({
    absWorkingDir: root, entryPoints: [entry], bundle: true, format: "cjs", jsx: "automatic",
    platform: "neutral", target: "es2020", mainFields: ["module", "main"], supported: { "async-await": false },
    external: ["@getpaseo/plugin", "@getpaseo/plugin/client", "@getpaseo/plugin/client/ui", "react", "react/jsx-runtime", "react-native", "zod", "@tanstack/react-query"],
    write: false, treeShaking: true,
  });
  const code = result.outputFiles[0].text.replaceAll("get: () => from[key]", "value: from[key]");
  return `(function(require) { const module = { exports: {} }; const exports = module.exports;\n${code}\nreturn module.exports; })`;
}

// Host UI/hooks and schema construction are stubs here. This checks real bundled
// dependencies and engine evaluation, NOT native UI rendering or Zod validation.
const host = `
function check(value, message) { if (!value) throw new Error(message); }
var schema = {};
["optional", "int", "nonnegative"].forEach(function(key) { schema[key] = function() { return schema; }; });
var z = {};
["object", "string", "number", "enum", "json", "array"].forEach(function(key) { z[key] = function() { return schema; }; });
function runtimeRequire(name) {
  if (name === "zod") return { z: z };
  if (["react", "react/jsx-runtime", "react-native", "@getpaseo/plugin/client/ui"].indexOf(name) !== -1) return {};
  throw new Error("Unexpected external module: " + name);
}
var evaluate = globalThis.eval;
`;

let entryBundle;
let highlightBundle;
let detailsBundle;
beforeAll(async () => {
  [entryBundle, highlightBundle, detailsBundle] = await Promise.all([bundle("index.client.tsx"), bundle("client/highlight.ts"), bundle("shared/details.ts")]);
});

function smoke() {
  return host + `
var contributions = [];
var removed = [];
function register(item) { contributions.push(item); return function() { removed.push(item); }; }
function active(predicate) { return contributions.filter(function(item) { return predicate(item) && removed.indexOf(item) === -1; }); }
function isToolTransformer(item) { return item.query && item.query.itemType === "tool_call"; }
function isThinkingTransformer(item) { return item.query && item.query.itemType === "reasoning"; }
var entry = evaluate(${JSON.stringify(entryBundle)})(runtimeRequire);
var cleanup = entry.default({
  addSettingsScreen: function() { throw new Error("Redundant Activity settings entry"); },
  addTimelineTransformer: register, addTimelineRenderer: register, addCommandCenterItem: register
});
check(contributions.length === 6, "Expected tool/Thinking timeline contributions and two commands");
var renderers = active(function(item) { return typeof item.Component === "function"; });
var thinking = active(isThinkingTransformer);
var commands = active(function(item) { return typeof item.onSelect === "function"; });
check(renderers.length === 2 && thinking.length === 1, "Missing renderers or density-only Thinking adapter");
check(thinking[0].transform({ item: { text: "**original**" }, phase: "streaming" }).items[0].data.text === "**original**", "Thinking text was rewritten");
check(commands.length === 2 && commands.every(function(item) { return item.context === "global" && item.title.indexOf("Activity: ") === 0; }), "Missing global mode commands");
var nativeRows = commands.filter(function(item) { return item.id === "native-tool-rows"; })[0];
var toolCards = commands.filter(function(item) { return item.id === "tool-cards"; })[0];
check(active(isToolTransformer).length === 1, "Tool cards are not the default");
toolCards.onSelect({});
check(active(isToolTransformer).length === 1, "Repeated card command duplicated the transformer");
nativeRows.onSelect({});
nativeRows.onSelect({});
check(active(isToolTransformer).length === 0 && active(isThinkingTransformer).length === 0, "Native rows kept a tool or Thinking transformer");
check(active(function(item) { return typeof item.Component === "function"; }).length === 2, "Native rows removed a renderer");
toolCards.onSelect({});
toolCards.onSelect({});
var toolTransformers = active(isToolTransformer);
check(toolTransformers.length === 1 && contributions.filter(isToolTransformer).length === 2, "Tool cards were not restored once");
check(active(isThinkingTransformer).length === 1 && contributions.filter(isThinkingTransformer).length === 2, "Thinking was not restored once");
check(toolTransformers[0].transform({ phase: "complete", item: { type: "tool_call", callId: "paseo-agent-message:m", name: "agent_message",
  status: "completed", error: null, detail: { type: "plain_text", text: "Hi", icon: "bot" } } }) === undefined, "Agent message became a card");
var projected = toolTransformers[0].transform({ phase: "streaming", item: {
  type: "tool_call", callId: "outer", name: "exec", status: "running", error: null,
  detail: { type: "unknown", input: { code: "compose tools" }, output: { content: [], details: {
    cellId: "cell", status: "running", traces: [{
      id: "trace", name: "exec_command", input: { cmd: "npm test" }, status: "done",
      result: { content: [], details: { chunk_id: "chunk", wall_time_seconds: 0, output: "", exit_code: 2 } }
    }]
  } } }
} });
check(projected.items[0].data.detail.output.details.traces[0].result.details.exit_code === 2, "Conversion source data lost");
check(!projected.items[0].data.activity, "Removed Calls annotation was reintroduced");
check(projected.items[0].data.status === "running", "Conversion replaced the host status");
var details = evaluate(${JSON.stringify(detailsBundle)})(runtimeRequire);
var sections = details.detailSections(projected.items[0].data);
check(sections.length === 2 && sections[0].value === "compose tools", "Unified input adaptation failed");
var formatted = details.presentValue(sections[1].value);
check(formatted.language === "json" && JSON.parse(formatted.text).details.traces[0].result.details.exit_code === 2, "Formatted output lost metadata");
check(details.previewText(formatted.text).text.split("\\n").length === 20, "Native preview is not twenty lines");
check(details.prettyJson('{"n":9007199254740993,"n":1}').indexOf("9007199254740993") !== -1, "Numeric lexeme lost");
cleanup();
check(contributions.every(function(item) { return removed.indexOf(item) !== -1; }) && removed.length === contributions.length, "Cleanup did not unregister every contribution once");
check(removed[removed.length - 1] === contributions[0], "Cleanup did not unregister in reverse order");
var highlight = evaluate(${JSON.stringify(highlightBundle)})(runtimeRequire).highlightCode;
var colors = { foreground: "#dddddd", foregroundMuted: "#aaaaaa", accent: "#9ab8ce", surface1: "#181818" };
var samples = {
  bash: 'echo "hello"', css: 'a { color: red; }', go: 'var s = "hello"',
  html: '<div title="hello">text</div>', javascript: 'const s = "hello";',
  json: '{"s":"hello"}', markdown: '**hello**', python: 's = "hello"',
  rust: 'let s = "hello";', typescript: 'const s: string = "hello";',
  yaml: 's: "hello"', jsx: '<A name="hello" />', tsx: '<A name="hello" />'
};
Promise.all(Object.keys(samples).map(function(language) {
  var code = '\\n中文 🐈\\r\\n' + samples[language] + '\\n\\n';
  return highlight(code, language, colors).then(function(tokens) {
    check(tokens !== null, "Native highlighting fell back: " + language);
    check(tokens.map(function(line) { return line.map(function(token) { return token.content; }).join(""); }).join("\\n") === code, "Changed source: " + language);
    check(tokens.some(function(line) { return line.some(function(token) { return token.color !== colors.foreground; }); }), "Missing token colors: " + language);
  });
})).then(function() {
  check(typeof globalThis.Prism === "undefined", "Leaked global Prism");
  print("BUNDLE_SMOKE_OK");
}, function(error) { print("BUNDLE_SMOKE_FAILED " + error.stack); });
`;
}

describe("client bundle evaluation", () => {
  it("loads, registers, tokenizes and cleans up in a DOM-free JavaScript context", async () => {
    const output = [];
    await runInNewContext(smoke(), { print: (value) => output.push(value) }, { timeout: 10_000 });
    expect(output).toEqual(["BUNDLE_SMOKE_OK"]);
  });

  it.skipIf(!existsSync(hermes))("loads the full entry and all supported grammars in the RN Hermes engine", () => {
    const directory = mkdtempSync(join(tmpdir(), "activity-hermes-"));
    try {
      const file = join(directory, "smoke.js");
      writeFileSync(file, smoke());
      const output = execFileSync(hermes, [file], { encoding: "utf8", timeout: 20_000, maxBuffer: 128_000 });
      expect(output.trim()).toBe("BUNDLE_SMOKE_OK");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
