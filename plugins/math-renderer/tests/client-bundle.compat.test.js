import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hermesPlatform = { darwin: "osx-bin", linux: "linux64-bin", win32: "win64-bin" }[process.platform];
const hermes = process.env.HERMES_BIN || join(root, "node_modules/react-native/sdks/hermesc", hermesPlatform || "unsupported", process.platform === "win32" ? "hermes.exe" : "hermes");

// Paseo v0.9.0-beta.1 compiler options and eager CommonJS interop (compiler.ts and the app
// plugin loader are unchanged through v0.10.0-beta.1), followed by string
// evaluation without Metro/Babel. Pinned source:
// https://github.com/getpaseo/paseo/blob/7c1958f5b0a4ae9f2cb12f77b0a754a644cd0081/packages/server/src/server/plugins/compiler.ts
async function bundle(entry) {
  const result = await build({
    absWorkingDir: root, entryPoints: [entry], bundle: true, format: "cjs", jsx: "automatic",
    platform: "neutral", target: "es2020", supported: { "async-await": false },
    external: ["@getpaseo/plugin", "@getpaseo/plugin/client", "@getpaseo/plugin/client/ui", "@getpaseo/plugin/client/react-native", "react", "react/jsx-runtime", "react-native", "zod", "@tanstack/react-query"],
    write: false, treeShaking: true,
  });
  const code = result.outputFiles[0].text.replaceAll("get: () => from[key]", "value: from[key]");
  return `(function(require) { const module = { exports: {} }; const exports = module.exports;\n${code}\nreturn module.exports; })`;
}

// Only the host modules are stubbed. The complete client entry and its Markdown
// dependencies are real; this does not establish on-device UI/RPC behavior.
const host = `
function check(value, message) { if (!value) throw new Error(message); }
var schema = {};
["trim", "min", "max", "int", "positive", "regex", "strict", "startsWith"].forEach(function(key) {
  schema[key] = function() { return schema; };
});
var z = {};
["object", "string", "number", "boolean", "literal", "discriminatedUnion"].forEach(function(key) {
  z[key] = function() { return schema; };
});
function runtimeRequire(name) {
  if (name === "zod") return { z: z };
  if (name === "@getpaseo/plugin") return { defineRpc: function(contract) { return contract; } };
  if (["react", "react/jsx-runtime", "react-native", "@getpaseo/plugin/client", "@getpaseo/plugin/client/react-native", "@tanstack/react-query"].indexOf(name) !== -1) return {};
  throw new Error("Unexpected external module: " + name);
}
var evaluate = globalThis.eval;
`;

let entryBundle;
let parserBundle;
const samples = ["a", "b"].map(name => readFileSync(join(root, "tests/fixtures/synthetic/math-live-" + name + ".md"), "utf8"));
beforeAll(async () => {
  [entryBundle, parserBundle] = await Promise.all([bundle("index.client.tsx"), bundle("shared/markdown.ts")]);
});

function smoke() {
  return host + `
var contributions = [];
var removed = [];
var commands = [];
var removedCommands = [];
function register(item) { contributions.push(item); return function() { removed.push(item); }; }
var entry = evaluate(${JSON.stringify(entryBundle)})(runtimeRequire);
var cleanup = entry.default({ addTimelineTransformer: register, addTimelineRenderer: register,
  addCommandCenterItem: function(item) { commands.push(item); return function() { removedCommands.push(item); }; }
});
check(contributions.length === 2, "Expected transformer and renderer");
var transformer = contributions[1];
check(transformer.query.itemType === "assistant_message", "Wrong source type");
check(typeof contributions[0].Component === "function", "Missing renderer");
var parse = evaluate(${JSON.stringify(parserBundle)})(runtimeRequire).parseDocument;
var samples = ${JSON.stringify(samples)};
samples.forEach(function(text, index) {
  // Six display formulas each, plus the inline ones.
  check(parse(text).formulas === [27, 9][index], "Mixed Markdown lost formulas");
  for (var n = 0; n <= text.length; n++) {
    var prefix = text.slice(0, n);
    var source = Object.freeze({ type: "assistant_message", text: prefix });
    check(transformer.transform({ item: source, phase: "streaming" }) === undefined, "Streaming must stay native");
    var result = transformer.transform({ item: source, phase: "complete" });
    if (result) {
      check(result.items.length === 1 && result.items[0].data.text === prefix, "Streaming source changed");
      check(result.items[0].id === undefined, "Overrode host source identity");
    }
  }
});
var text = "Entity &amp; &#x1F408; &copy; 中文\\n\\n$$x^2$$";
check(parse(text).blocks[0].inline[0].text === "Entity & 🐈 © 中文", "Entity decoding failed");
["$$x^2$$", "\\\\[\\nx^2\\n\\\\]", "~~~math\\nx^2\\n~~~", "> $$x^2$$", "- item\\n\\n  $$x^2$$"].forEach(function(text) {
  check(parse(text).formulas === 1, "Display delimiter/container failed: " + text);
});
["No formula", "$$\\nx^2", "~~~math\\nx^2", "~~~js\\n$$x$$\\n~~~", "![image](https://example.com/x)\\n\\n$$x$$"].forEach(function(text) {
  check(transformer.transform({ item: { type: "assistant_message", text: text }, phase: "complete" }) === undefined, "Native fallback failed");
});
check(parse("") === null && parse("x".repeat(96001)) === null, "Input limits failed");
check(parse(Array(65).fill("$$x$$").join("\\n\\n")) === null, "Formula limit failed");
check(commands.length === 2, "Missing native/Math actions");
commands[0].onSelect(); commands[0].onSelect();
check(removed.length === 1 && removed[0] === transformer, "Native action must remove only the transformer once");
commands[1].onSelect(); commands[1].onSelect();
check(contributions.length === 3, "Render action must not register duplicate transformers");
commands[0].onSelect(); commands[1].onSelect();
cleanup();
check(removed.length === 4 && removed[3] === contributions[0] && removedCommands.length === 2, "Cleanup failed");
print("BUNDLE_SMOKE_OK");
`;
}

describe("client bundle evaluation", () => {
  it("loads, parses streaming Markdown and cleans up in a DOM-free JavaScript context", () => {
    const output = [];
    runInNewContext(smoke(), { print: value => output.push(value) }, { timeout: 20_000 });
    expect(output).toEqual(["BUNDLE_SMOKE_OK"]);
  });

  it.skipIf(!existsSync(hermes))("loads the complete client and parses Markdown in the RN Hermes engine", () => {
    const directory = mkdtempSync(join(tmpdir(), "math-hermes-"));
    try {
      const file = join(directory, "smoke.js");
      writeFileSync(file, smoke());
      const output = execFileSync(hermes, [file], { encoding: "utf8", timeout: 20_000, maxBuffer: 128_000, stdio: ["ignore", "pipe", "pipe"] });
      expect(output.trim()).toBe("BUNDLE_SMOKE_OK");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
