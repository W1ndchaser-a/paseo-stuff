import { Buffer } from "node:buffer";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import "mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { wasmBase64 } from "./generated/wasm";
import { renderInput, renderOutput, type RenderInput, type RenderOutput } from "../shared/contracts";

let wasmReady: Promise<void> | undefined;
function initialize() {
  // The WASM JS module permits initialization once. No URL, system fonts or runtime asset reads.
  return wasmReady ??= initWasm(Buffer.from(wasmBase64, "base64"));
}
const failure = (reason: string): RenderOutput => ({ ok: false, reason });

function validateComplexity(tex: string) {
  if (/\\(?:require|autoload|input|include|href|url|style|class|cssId|html\w*|includegraphics|unicode|def|gdef|edef|xdef|newcommand|renewcommand|let)\b/.test(tex))
    throw new Error("Unsupported TeX command");
  let depth = 0, maxDepth = 0;
  for (const c of tex) { if (c === "{") maxDepth = Math.max(maxDepth, ++depth); else if (c === "}") depth--; }
  if (maxDepth > 32 || (tex.match(/\\[a-zA-Z]+/g)?.length ?? 0) > 256 || tex.split("\\\\").length > 40)
    throw new Error("Formula complexity limit");
}

export function createMathRenderer({ maxEntries = 128, maxBytes = 8_000_000 } = {}) {
  const cache = new Map<string, RenderOutput>();
  let bytes = 0, pending = 0, disposed = false;
  const adaptor = liteAdaptor();
  const handler = RegisterHTMLHandler(adaptor);
  const size = (result: RenderOutput) => result.ok ? result.uri.length : 0;
  function remember(key: string, result: RenderOutput) {
    cache.set(key, result);
    bytes += size(result);
    while (cache.size > maxEntries || bytes > maxBytes) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      bytes -= size(cache.get(oldest)!);
      cache.delete(oldest);
    }
  }
  async function render(raw: RenderInput): Promise<RenderOutput> {
    if (disposed) return failure("Renderer stopped");
    const parsed = renderInput.safeParse(raw);
    if (!parsed.success) return failure("Formula or render settings exceed limits");
    const input = parsed.data;
    const key = JSON.stringify(input);
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
    if (pending >= 16) return failure("Renderer busy; retry this formula");
    pending++;
    try {
      validateComplexity(input.tex);
      await initialize();
      if (disposed) return failure("Renderer stopped");
      const existing = cache.get(key);
      if (existing) return existing;
      // New TeX/document per expression: labels/macros cannot leak across messages or agents.
      const document = mathjax.document("", {
        InputJax: new TeX({ packages: ["base", "ams", "boldsymbol"], maxBuffer: 4096, maxMacros: 256,
          formatError: () => { throw new Error("Invalid TeX"); } }),
        OutputJax: new SVG({ fontCache: "none", internalSpeechTitles: false }),
      });
      const node = document.convert(input.tex, { display: input.display, em: input.fontSize, ex: input.fontSize / 2, containerWidth: 1200 });
      const svg = adaptor.tags(node, "svg")[0];
      if (!svg || adaptor.tags(svg, "text").length || adaptor.tags(svg, "image").length || adaptor.tags(svg, "a").length)
        throw new Error("Formula needs unsupported text, font or resource");
      const box = String(adaptor.getAttribute(svg, "viewBox")).split(/\s+/).map(Number);
      if (box.length !== 4 || box.some(n => !Number.isFinite(n))) throw new Error("Invalid equation bounds");
      const pad = 2000 / input.fontSize;
      // MathJax lowers the SVG by its depth with vertical-align in ex; add the 2px padding.
      const lowered = /vertical-align:\s*(-?[\d.]+)ex/.exec(String(adaptor.getAttribute(svg, "style") ?? ""));
      const depth = Math.max(0, -Number(lowered?.[1] ?? 0)) * input.fontSize / 2 + 2;
      const width = Math.ceil(box[2] * input.fontSize / 1000 + 4);
      const height = Math.ceil(box[3] * input.fontSize / 1000 + 4);
      if (width <= 4 || height <= 4 || width > 2400 || height > 800 || width * height * input.scale ** 2 > 4_000_000)
        throw new Error("Formula image size limit");
      adaptor.setAttribute(svg, "viewBox", [box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad].join(" "));
      adaptor.setAttribute(svg, "width", width);
      adaptor.setAttribute(svg, "height", height);
      adaptor.setAttribute(svg, "color", input.color);
      const xml = adaptor.outerHTML(svg).replaceAll("currentColor", input.color);
      if (xml.length > 1_000_000) throw new Error("Formula vector size limit");
      const raster = new Resvg(xml, { fitTo: { mode: "zoom", value: input.scale }, font: { loadSystemFonts: false } });
      let result: RenderOutput;
      try {
        const image = raster.render();
        try {
          const png = image.asPng();
          if (png.byteLength > 1_000_000) throw new Error("Formula image byte limit");
          result = renderOutput.parse({ ok: true, uri: "data:image/png;base64," + Buffer.from(png).toString("base64"), width, height, depth });
        } finally { image.free(); }
      } finally { raster.free(); }
      remember(key, result);
      return result;
    } catch {
      const result = failure("Cannot typeset this formula safely; original LaTeX retained");
      if (!disposed) remember(key, result);
      return result;
    } finally { pending--; }
  }
  return {
    render,
    stats: () => ({ entries: cache.size, bytes, pending, disposed }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cache.clear();
      bytes = 0;
      mathjax.handlers.unregister(handler);
    },
  };
}
