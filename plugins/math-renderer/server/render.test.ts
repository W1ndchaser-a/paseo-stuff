import { describe, expect, it } from "vitest";
import { createMathRenderer } from "./render";
import type { RenderInput } from "../shared/contracts";

const input: RenderInput = { tex: "x^2", color: "#eeeeee", fontSize: 18, scale: 2, display: true };
describe("real MathJax → embedded WASM → PNG", () => {
  it.each([
    String.raw`x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}`,
    String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
    String.raw`\int_0^\infty e^{-x^2}\,dx=\frac{\sqrt{\pi}}{2}`,
    String.raw`\begin{aligned}a&=b+c\\&=d\end{aligned}`,
  ])("typesets %s with PNG bounds", async tex => {
    const renderer = createMathRenderer();
    try {
      const result = await renderer.render({ ...input, tex });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const png = Buffer.from(result.uri.split(",")[1], "base64");
        expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(png.readUInt32BE(16)).toBe(result.width * 2);
        expect(png.readUInt32BE(20)).toBe(result.height * 2);
        expect(result.width).toBeGreaterThan(10);
        expect(result.height).toBeGreaterThan(10);
      }
    } finally { renderer.dispose(); }
  });
  it("typesets inline formulas smaller, with their depth below the baseline", async () => {
    const renderer = createMathRenderer();
    try {
      const tex = String.raw`\frac{a}{b}`;
      const block = await renderer.render({ ...input, tex });
      const inline = await renderer.render({ ...input, tex, display: false });
      const flat = await renderer.render({ ...input, tex: "x^2", display: false });
      expect(block.ok && inline.ok && flat.ok).toBe(true);
      if (block.ok && inline.ok && flat.ok) {
        expect(inline.height).toBeLessThan(block.height);
        expect(inline.depth).toBeGreaterThan(flat.depth);
        expect(flat.depth).toBeGreaterThanOrEqual(2);
        expect(inline.depth).toBeLessThan(inline.height);
      }
    } finally { renderer.dispose(); }
  });
  it("caches by color and density, evicts and disposes", async () => {
    const renderer = createMathRenderer({ maxEntries: 2 });
    const a = await renderer.render(input);
    expect(await renderer.render(input)).toBe(a);
    const light = await renderer.render({ ...input, color: "#111111" });
    expect(light).not.toEqual(a);
    await renderer.render({ ...input, scale: 3 });
    expect(renderer.stats().entries).toBe(2);
    expect(renderer.stats().bytes).toBeGreaterThan(0);
    renderer.dispose(); renderer.dispose();
    expect(renderer.stats()).toMatchObject({ entries: 0, bytes: 0, pending: 0 });
    expect((await renderer.render(input)).ok).toBe(false);
  });
  it.each(["", "x".repeat(4097), String.raw`\badUnknownCommand{1}`,
    String.raw`\frac{a`, String.raw`\require{html}`, String.raw`\href{https://example.com}{x}`,
    String.raw`\def\x{\x}\x`, String.raw`\rule{99999em}{99999em}`,
    "{".repeat(40) + "x" + "}".repeat(40),
  ])("retains source on malformed/unsafe/oversize input %s", async tex => {
    const renderer = createMathRenderer();
    try { expect((await renderer.render({ ...input, tex })).ok).toBe(false); }
    finally { renderer.dispose(); }
  });
  it("handles disable while initialization is pending", async () => {
    const renderer = createMathRenderer();
    const task = renderer.render(input);
    renderer.dispose();
    expect((await task).ok).toBe(false);
    expect(renderer.stats().bytes).toBe(0);
  });
});
