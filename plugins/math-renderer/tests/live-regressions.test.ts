import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument, type Block, type Inline } from "../shared/markdown";
import { transformMessage } from "../client/transform";
import { createMathRenderer } from "../server/render";

// Synthetic model output captured from a real local Paseo 0.8.0 acceptance session.
// Contains no user conversation, IDs or private data. This replay is not a UI test.
const sample = readFileSync(new URL("./fixtures/synthetic/math-live-a.md", import.meta.url), "utf8").trimEnd();
function formulas(blocks: Block[]): Extract<Block, { kind: "math" }>[] {
  return blocks.flatMap(block => block.kind === "math" ? [block] : "children" in block ? formulas(block.children) : []);
}
function inlineFormulas(blocks: Block[]): string[] {
  const walk = (items: Inline[]): string[] => items.flatMap(item => item.kind === "math" ? [item.tex] : "children" in item ? walk(item.children) : []);
  return blocks.flatMap(block => "inline" in block ? walk(block.inline) : "children" in block ? inlineFormulas(block.children) : []);
}
describe("live-session regressions", () => {
  it("typesets a multivariate normal density with bold Greek symbols, preserving source", async () => {
    const text = String.raw`$$
p(\mathbf{x}\mid\boldsymbol{\mu},\Sigma)
=
\frac{
\exp\!\left(
-\frac{1}{2}
(\mathbf{x}-\boldsymbol{\mu})^{\mathsf T}
\Sigma^{-1}
(\mathbf{x}-\boldsymbol{\mu})
\right)
}{
(2\pi)^{d/2}\sqrt{\det\Sigma}
},
\qquad \Sigma\succ 0
$$`;
    const doc = parseDocument(text)!;
    expect(doc.formulas).toBe(1);
    const [block] = formulas(doc.blocks);
    expect(block.raw).toBe(text);
    expect(block.tex).toBe(text.slice(3, -3));
    expect(transformMessage({ item: { type: "assistant_message", text }, phase: "complete" })?.items[0].data).toEqual({ text });
    const renderer = createMathRenderer();
    try {
      for (const color of ["#eeeeee", "#111111"]) {
        const result = await renderer.render({ tex: block.tex, color, fontSize: 18, scale: 3, display: true });
        expect(result.ok).toBe(true);
        if (result.ok) {
          const png = Buffer.from(result.uri.split(",")[1], "base64");
          expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
          expect(png.readUInt32BE(16)).toBe(result.width * 3);
          expect(png.readUInt32BE(20)).toBe(result.height * 3);
        }
      }
    } finally { renderer.dispose(); }
  });
  it("typesets all six display and 21 inline formulas from mixed model output, including wrapped math fence", async () => {
    const doc = parseDocument(sample)!;
    expect(doc.formulas).toBe(27);
    expect(formulas(doc.blocks)).toHaveLength(6);
    const renderer = createMathRenderer();
    try {
      for (const block of formulas(doc.blocks)) {
        expect((await renderer.render({ tex: block.tex, color: "#eeeeee", fontSize: 18, scale: 2, display: true })).ok, block.tex).toBe(true);
      }
      for (const tex of inlineFormulas(doc.blocks)) {
        expect((await renderer.render({ tex, color: "#eeeeee", fontSize: 15, scale: 2, display: false })).ok, tex).toBe(true);
      }
      expect(JSON.stringify(doc)).toContain("$$not_math$$");
      expect(JSON.stringify(doc)).toContain("END-MATH-LIVE-A");
    } finally { renderer.dispose(); }
  });
  it.each(["$$x^2$$  ", "\\[x^2\\] \t", "$$\r\nx^2\r\n$$", "```math\r\nx^2\r\n```"])("accepts whitespace and CRLF: %s", text => {
    expect(formulas(parseDocument(text)!.blocks)).toEqual([{ kind: "math", tex: "x^2", raw: text }]);
  });
  it.each(["$$x^2$$", "\\[\nx^2\n\\]"])("normalizes one fenced pair but retains copy/source: %s", wrapped => {
    const text = "```math\n" + wrapped + "\n```";
    expect(formulas(parseDocument(text)!.blocks)).toEqual([{ kind: "math", tex: "x^2", raw: text }]);
  });
  it("does not strip multiple display pairs inside one fence", () => {
    const tex = "$$a$$\n$$b$$";
    expect(formulas(parseDocument("```math\n" + tex + "\n```")!.blocks)[0].tex).toBe(tex);
  });
  it("preserves exact text at every streaming prefix without explicit global replacement IDs", () => {
    for (let n = 1; n <= sample.length; n++) {
      const text = sample.slice(0, n);
      const result = transformMessage({ item: { type: "assistant_message", text }, phase: "complete" });
      if (result) {
        expect(result.items[0].data).toEqual({ text });
        expect(result.items[0].id).toBeUndefined();
      }
    }
  });
  it("isolates a deliberately invalid formula among five valid nested/wide formulas", async () => {
    const text = readFileSync(new URL("./fixtures/synthetic/math-live-b.md", import.meta.url), "utf8").trimEnd();
    const doc = parseDocument(text)!;
    expect(doc.formulas).toBe(9);
    expect(inlineFormulas(doc.blocks)).toEqual(["x_i", "5", "10"]);
    const renderer = createMathRenderer();
    try {
      const results = [];
      for (const block of formulas(doc.blocks)) {
        results.push(await renderer.render({ tex: block.tex, color: "#eeeeee", fontSize: 18, scale: 2, display: true }));
      }
      expect(results.map(result => result.ok)).toEqual([true, true, true, true, false, true]);
      expect(results[3]).toMatchObject({ width: 1591 });
      expect(JSON.stringify(doc)).toContain("错误后正文");
      expect(JSON.stringify(doc)).toContain("$$not_math$$");
      expect(JSON.stringify(doc)).toContain("END-MATH-LIVE-B");
    } finally { renderer.dispose(); }
  });
});
