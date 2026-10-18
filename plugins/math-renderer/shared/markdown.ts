// Self-contained UMD parser lowered at build time for Hermes string evaluation.
// Also avoids legacy package resolution in the host's neutral esbuild target.
import MarkdownIt from "./generated/markdown.js";
import { MAX_FORMULAS, MAX_TEXT } from "./contracts";

// Derived from the generated parser: Paseo resolves type imports when it compiles the
// plugin, and npm installs only the runtime dependencies, which exclude markdown-it.
type Token = ReturnType<MarkdownIt["parse"]>[number];

export type Inline =
  | { kind: "text" | "code"; text: string }
  | { kind: "math"; tex: string; raw: string }
  | { kind: "strong" | "em" | "strike"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] };
export type Block =
  | { kind: "paragraph" | "heading"; inline: Inline[]; level: number }
  | { kind: "code" | "pending"; text: string }
  | { kind: "math"; tex: string; raw: string }
  | { kind: "quote" | "list" | "item"; children: Block[]; start: number }
  | { kind: "rule" };
export type Document = { blocks: Block[]; formulas: number };

const md = new MarkdownIt({ html: false, linkify: false, breaks: false });
// Deliberately original, conservative block parser: no arbitrary regex replacement of Markdown.
// Full-line display delimiters only; code fences/indentation remain Markdown's responsibility.
md.block.ruler.before("fence", "display_math", (state, start, end, silent) => {
  if (state.sCount[start] - state.blkIndent >= 4) return false;
  const line = (n: number) => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]);
  const first = line(start).trimEnd();
  const opening = first.startsWith("$$") ? "$$" : first.startsWith("\\[") ? "\\[" : null;
  if (!opening) return false;
  const closing = opening === "$$" ? "$$" : "\\]";
  const tail = first.slice(2);
  const firstClose = unescapedIndex(tail, closing);
  const sameLine = firstClose >= 0 && firstClose === tail.length - 2;
  if (firstClose >= 0 && !sameLine) return false;
  let next = start + 1;
  let tex: string;
  let complete = sameLine;
  if (sameLine) tex = tail.slice(0, -2);
  else {
    // A closing delimiter with trailing prose is unsupported, not a partial replacement.
    if (tail.includes(closing)) return false;
    const lines = [tail];
    while (next < end) {
      const value = line(next);
      if (value.trim() === closing) { complete = true; next++; break; }
      if (value.includes(closing)) return false;
      lines.push(value);
      next++;
    }
    tex = lines.join("\n");
  }
  if (complete && !tex.trim()) return false;
  if (silent) return true;
  const token = state.push(complete ? "math_block" : "math_pending", "", 0);
  token.content = tex.trim();
  token.block = true;
  token.map = [start, next];
  state.line = next;
  return true;
}, { alt: ["paragraph", "reference", "blockquote", "list"] });

// \(...\) and $...$ inside a paragraph become inline formulas. Like Pandoc, $ needs
// no space just inside either delimiter and no digit after the closing $, so
// prices stay text. Display delimiters mid-paragraph and unclosed TeX keep their
// source verbatim, which also stops Markdown from rewriting underscores in it.
md.inline.ruler.before("escape", "inline_math", (state, silent) => {
  const rest = state.src.slice(state.pos);
  const open = rest.startsWith("\\(") ? "\\(" : rest.startsWith("\\[") ? "\\[" : rest.startsWith("$$") ? "$$" : rest.startsWith("$") ? "$" : null;
  if (!open) return false;
  const close = open === "\\(" ? "\\)" : open === "\\[" ? "\\]" : open;
  const at = unescapedIndex(rest, close, open.length);
  if (open.startsWith("$") && (at < 0 || /\s/.test(rest[open.length] ?? "") || /\s/.test(rest[at - 1] ?? ""))) return false;
  const length = at < 0 ? rest.length : at + close.length;
  const tex = at < 0 ? "" : rest.slice(open.length, at).trim();
  const formula = tex && (open === "\\(" || (open === "$" && !/\d/.test(rest[length] ?? "")));
  if (!silent) {
    const token = state.push(formula ? "math_inline" : "text", "", 0);
    token.content = formula ? tex : rest.slice(0, length);
    token.markup = rest.slice(0, length);
  }
  state.pos += length;
  return true;
});

function escaped(text: string, at: number) {
  let count = 0;
  while (at > 0 && text[--at] === "\\") count++;
  return count % 2 === 1;
}
function unescapedIndex(text: string, delimiter: string, from = 0) {
  let at = text.indexOf(delimiter, from);
  while (at >= 0 && escaped(text, at)) at = text.indexOf(delimiter, at + delimiter.length);
  return at;
}
function inline(tokens: Token[]): Inline[] {
  let i = 0;
  function take(end?: string): Inline[] {
    const out: Inline[] = [];
    while (i < tokens.length) {
      const t = tokens[i++];
      if (t.type === end) return out;
      if (t.type === "text") {
        if (/<\/?[a-z][^>]*>/i.test(t.content)) throw new Error("Keep HTML presentation native");
        out.push({ kind: "text", text: t.content });
      }
      else if (t.type === "softbreak" || t.type === "hardbreak") out.push({ kind: "text", text: "\n" });
      else if (t.type === "code_inline") out.push({ kind: "code", text: t.content });
      else if (t.type === "math_inline") out.push({ kind: "math", tex: t.content, raw: t.markup });
      else if (t.type === "strong_open" || t.type === "em_open" || t.type === "s_open") {
        const kind = t.type === "strong_open" ? "strong" : t.type === "em_open" ? "em" : "strike";
        out.push({ kind, children: take(t.type.replace("_open", "_close")) });
      } else if (t.type === "link_open") {
        const href = t.attrGet("href") ?? "";
        if (!/^https?:\/\//i.test(href)) throw new Error("Native file/link behavior must remain native");
        out.push({ kind: "link", href, children: take("link_close") });
      } else throw new Error("Unsupported inline: " + t.type);
    }
    return out;
  }
  return take();
}
function inlineFormulas(items: Inline[]): number {
  return items.reduce((n, item) => n + (item.kind === "math" ? 1 : "children" in item ? inlineFormulas(item.children) : 0), 0);
}
export function parseDocument(text: string): Document | null {
  if (!text || text.length > MAX_TEXT) return null;
  try {
    const tokens = md.parse(text, {});
    let i = 0, formulas = 0;
    function take(end?: string, depth = 0): Block[] {
      if (depth > 12) throw new Error("Nesting limit");
      const out: Block[] = [];
      while (i < tokens.length) {
        const t = tokens[i++];
        if (t.type === end) return out;
        if (t.type === "paragraph_open" || t.type === "heading_open") {
          const content = tokens[i++];
          if (content?.type !== "inline") throw new Error("Unsupported paragraph");
          const items = inline(content.children ?? []);
          formulas += inlineFormulas(items);
          out.push({ kind: t.type === "paragraph_open" ? "paragraph" : "heading",
            inline: items, level: Number(t.tag.slice(1)) || 0 });
          if (tokens[i++]?.type !== t.type.replace("_open", "_close")) throw new Error("Unclosed block");
        } else if (t.type === "math_block" || (t.type === "fence" && t.info.trim() === "math" && closedFence(t, text))) {
          formulas++;
          out.push({ kind: "math", tex: t.type === "fence" ? fencedTex(t.content) : t.content.trim(), raw: source(t, text) });
        } else if (t.type === "math_pending") out.push({ kind: "pending", text: source(t, text) });
        else if (t.type === "fence" || t.type === "code_block") out.push({ kind: "code", text: t.content });
        else if (t.type === "blockquote_open" || t.type === "bullet_list_open" || t.type === "ordered_list_open" || t.type === "list_item_open") {
          out.push({ kind: t.type === "blockquote_open" ? "quote" : t.type === "list_item_open" ? "item" : "list",
            start: t.type === "ordered_list_open" ? Number(t.attrGet("start") ?? 1) : 0,
            children: take(t.type.replace("_open", "_close"), depth + 1) });
        } else if (t.type === "hr") out.push({ kind: "rule" });
        else throw new Error("Unsupported block: " + t.type);
      }
      return out;
    }
    const blocks = take();
    return formulas <= MAX_FORMULAS ? { blocks, formulas } : null;
  } catch { return null; }
}
// Accept one redundant outer display pair in a math fence, without changing raw
// source or silently combining multiple expressions into a single TeX input.
function fencedTex(content: string) {
  const tex = content.trim();
  const open = tex.startsWith("$$") ? "$$" : tex.startsWith("\\[") ? "\\[" : null;
  if (!open) return tex;
  const close = open === "$$" ? "$$" : "\\]";
  return unescapedIndex(tex, close, open.length) === tex.length - close.length
    ? tex.slice(open.length, -close.length).trim() : tex;
}
function source(t: Token, text: string) {
  return text.split("\n").slice(t.map?.[0] ?? 0, t.map?.[1] ?? 0).join("\n");
}
function closedFence(t: Token, text: string) {
  if (!t.map || t.map[1] - t.map[0] < 2) return false;
  const last = text.split("\n")[t.map[1] - 1]?.replace(/^(?:\s*>\s*)+/, "").trim() ?? "";
  // markdown-it only marks fenced content; verify a real closing fence for streaming.
  return last.length >= t.markup.length && last.split("").every(c => c === t.markup[0]);
}
