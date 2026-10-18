import { describe, expect, it } from "vitest";
import { parseDocument } from "./markdown";
import { transformMessage } from "../client/transform";

const math = "$$x^2$$";
describe("conservative Markdown + display math", () => {
  it.each(["$$x^2$$", "$$\nx^2\n$$", "\\[\nx^2\n\\]", "```math\nx^2\n```"])("recognizes %s", text => {
    expect(parseDocument(text)?.formulas).toBe(1);
    expect(transformMessage({ item: { type: "assistant_message", text }, phase: "complete" })?.items[0].data).toEqual({ text });
  });
  it.each(["normal", "$5 and $10", "`$$x$$`", "```js\n$$x$$\n```", "    $$x$$", "\\$\\$x\\$\\$", "$$\nx^2", "```math\nx^2"])("passes native content through: %s", text => {
    expect(transformMessage({ item: { type: "assistant_message", text }, phase: "complete" })).toBeUndefined();
  });
  it("typesets inline formulas and keeps a subsequent unfinished block", () => {
    const doc = parseDocument(math + "\n\n行内 \\(x^2\\) 公式。\n\n\\[\nx^3")!;
    expect(doc.formulas).toBe(2);
    expect(doc.blocks[1]).toMatchObject({ inline: [
      { kind: "text", text: "行内 " }, { kind: "math", tex: "x^2", raw: "\\(x^2\\)" }, { kind: "text", text: " 公式。" },
    ] });
    expect(doc.blocks[2]).toEqual({ kind: "pending", text: "\\[\nx^3" });
  });
  it.each(["Let $x$ be real.", "If \\(a \\ne b\\), stop.", "- **$E=mc^2$** holds", "> see $\\alpha_1$"])("renders inline math: %s", text => {
    expect(parseDocument(text)?.formulas).toBe(1);
    expect(transformMessage({ item: { type: "assistant_message", text }, phase: "complete" })?.items[0].data).toEqual({ text });
  });
  it.each(["costs $5 and $10", "$5-$6 each", "US$5 and US$6", "pay $ 5 or $ 6", "a $x $ b", "\\$x\\$", "`$x$`", "$x", "\\(x", "\\(\\)", "$$ $$ x"])("keeps prices and unclosed TeX as text: %s", text => {
    expect(parseDocument(text)?.formulas ?? 0).toBe(0);
    expect(transformMessage({ item: { type: "assistant_message", text }, phase: "complete" })).toBeUndefined();
  });
  it("supports lists, quotes, headings, code and web links", () => {
    const text = "# Result\n\n- **one**\n- [two](https://example.com)\n\n> quote\n\n" + math + "\n\n```js\nconst x = 1\n```";
    expect(parseDocument(text)?.formulas).toBe(1);
  });
  it.each(["![image](https://example.com/x.png)", "[file](./a.ts)", "|a|b|\n|-|-|\n|1|2|"])("preserves unsupported host behavior: %s", prefix => {
    expect(parseDocument(prefix + "\n\n" + math)).toBeNull();
  });
  it("keeps raw input and delegates replacement identity to the host", () => {
    const text = math + "\n\nMore";
    const one = transformMessage({ item: Object.freeze({ type: "assistant_message" as const, text }), phase: "complete" });
    const two = transformMessage({ item: { type: "assistant_message", text: text + " words" }, phase: "complete" });
    expect(one?.items[0].id).toBeUndefined();
    expect(two?.items[0].id).toBeUndefined();
    expect(JSON.parse(JSON.stringify(one))).toEqual(one);
    expect(one?.items[0].data).toEqual({ text });
  });
  it("bounds large or empty input and formula count", () => {
    expect(parseDocument("")).toBeNull();
    expect(parseDocument(math + "x".repeat(96_000))).toBeNull();
    expect(parseDocument(Array(64).fill(math).join("\n\n"))?.formulas).toBe(64);
    expect(parseDocument(Array(65).fill(math).join("\n\n"))).toBeNull();
    expect(parseDocument(Array(65).fill("$x$").join(" "))).toBeNull();
  });
  it.each(["> ```math\n> x^2\n> ```", "- item\n\n  $$\n  x^2\n  $$"])("handles nested math without flattening containers: %s", text => {
    expect(parseDocument(text)?.formulas).toBe(1);
  });
  it("preserves underscores/backslashes inside inline TeX", () => {
    const doc = parseDocument("inline $x_i$ and $x_j$ with \\(x_i\\), but \\[a_b\\] stays")!;
    expect(doc.formulas).toBe(3);
    expect(doc.blocks[0]).toMatchObject({ inline: [
      { kind: "text", text: "inline " }, { kind: "math", tex: "x_i", raw: "$x_i$" },
      { kind: "text", text: " and " }, { kind: "math", tex: "x_j", raw: "$x_j$" },
      { kind: "text", text: " with " }, { kind: "math", tex: "x_i", raw: "\\(x_i\\)" },
      { kind: "text", text: ", but \\[a_b\\] stays" },
    ] });
  });
  it("does not combine multiple same-line formulas into one expression", () => {
    expect(parseDocument("$$a$$ and $$b$$")?.formulas).toBe(0);
  });
  it("leaves explicit HTML and non-HTTP links native", () => {
    expect(parseDocument("<div>hi</div>\n\n" + math)).toBeNull();
    expect(parseDocument("[email](mailto:x@example.com)\n\n" + math)).toBeNull();
  });
});
