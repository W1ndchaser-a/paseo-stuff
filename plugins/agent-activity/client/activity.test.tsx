import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReasoningItemData, ToolCallItemData } from "../shared/timeline";
import { ReasoningActivity, ToolActivity } from "./activity";
import { useSyntaxTokens } from "./highlight";
import { presentValue } from "../shared/details";

vi.mock("react-native", () => ({ Pressable: "Pressable", Text: "Text", View: "View", ActivityIndicator: "ActivityIndicator",
  useWindowDimensions: vi.fn(), Platform: { OS: "web" },
}));
vi.mock("@getpaseo/plugin/client/react-native", () => ({ Icon: "Icon", ScrollView: "ScrollView" }));
vi.mock("./highlight", () => ({ useSyntaxTokens: vi.fn(() => null) }));
const mounted = new Set<ReactTestRenderer>();
beforeAll(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.mocked(useWindowDimensions).mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 });
  vi.mocked(useSyntaxTokens).mockReset();
  vi.mocked(useSyntaxTokens).mockReturnValue(null);
  vi.spyOn(console, "error").mockImplementation((message, ...args: unknown[]) => {
    if (String(message).startsWith("react-test-renderer is deprecated.")) return;
    throw new Error([message, ...args].map(String).join(" "));
  });
});
afterEach(async () => {
  await act(async () => { for (const renderer of mounted) renderer.unmount(); });
  mounted.clear(); vi.restoreAllMocks();
});
async function mount(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(element); });
  mounted.add(renderer); return renderer;
}
function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === "string" ? child : text(child)).join("");
}
function displayed(renderer: ReactTestRenderer) {
  return renderer.root.findAll(node => String(node.type) === "Text")
    .flatMap(node => node.children.filter(child => typeof child === "string")).join("\n");
}
function buttons(renderer: ReactTestRenderer) {
  return renderer.root.findAllByProps({ accessibilityRole: "button" }).map(node => node.props.accessibilityLabel);
}
async function press(renderer: ReactTestRenderer, label: string) {
  await act(async () => renderer.root.findByProps({ accessibilityLabel: label }).props.onPress());
}
function previews(renderer: ReactTestRenderer) {
  return renderer.root.findAll(node => String(node.type) === "ScrollView" && node.props.onContentSizeChange);
}
async function measure(renderer: ReactTestRenderer, index: number, height: number) {
  await act(async () => previews(renderer)[index]!.props.onContentSizeChange(300, height));
}
const data = (input: unknown, output: unknown, status: ToolCallItemData["status"] = "completed", name = "tool"): ToolCallItemData => ({
  name, status, detail: { type: "unknown", input, output } as ToolCallItemData["detail"], presentation: { icon: "Code" },
});

describe.each([
  { compact: false, dark: true, platform: "web" as const },
  { compact: true, dark: false, platform: "ios" as const },
])("unified renderer (mocked layout $platform, dark $dark)", ({ compact, dark, platform }) => {
  beforeEach(() => { Reflect.set(Platform, "OS", platform); });
  function props<Data>(value: Data, kind = "colorful-tool-call"): PluginTimelineItemProps<Data> {
    return {
      agentId: "synthetic-agent", timestamp: new Date(0), host: { id: "local", label: "Local" },
      layout: { compact, platform },
      theme: { colors: {
        surface0: dark ? "#171717" : "#faf9f6", surface1: dark ? "#252525" : "#f2f0e9",
        surface2: dark ? "#303030" : "#e8e5de", border: "#808080",
        foreground: dark ? "#eeeeee" : "#202020", foregroundMuted: dark ? "#aaaaaa" : "#606060",
        accent: "#20744A", accentForeground: "#ffffff",
        statusSuccess: dark ? "#6cb17b" : "#3e704a", statusWarning: dark ? "#c09664" : "#7b5d39", statusDanger: "#aa5555",
      } } as PluginTimelineItemProps["theme"],
      item: { type: "plugin", kind, version: 1, data: value },
    };
  }
  function thought(text: string, phase: ReasoningItemData["phase"] = "complete") {
    return props({ text, phase }, "colorful-reasoning");
  }
  it.each(["streaming", "complete"] as const)("starts %s Thinking collapsed with the shared compact header", async phase => {
    const renderer = await mount(<ReasoningActivity {...thought("hidden", phase)} />);
    expect(buttons(renderer)).toEqual(["Expand Thinking"]);
    expect(displayed(renderer)).not.toContain("hidden");
    expect(useSyntaxTokens).not.toHaveBeenCalled();
    const header = renderer.root.findByProps({ accessibilityLabel: "Expand Thinking" });
    expect(header.props.style({ pressed: false })[0]).toMatchObject({
      minHeight: 16, paddingVertical: 0,
    });
    const title = renderer.root.findAll(node => String(node.type) === "Text" && node.children.includes("Thinking"))[0]!;
    expect(title.props.style[0]).toMatchObject({ fontSize: 14 });
    expect(title.props.style[0]).not.toHaveProperty("lineHeight");
    expect(title.props.allowFontScaling).not.toBe(false);
    expect(renderer.root.findByType("Icon" as React.ElementType).props.size).toBe(12);
  });
  it("keeps Thinking literal, selectable and bounded without restoring Markdown or JSON interpretation", async () => {
    const source = "**Keep** <literal> 中文 🐈\r\n" + "\n" + '{"n":9007199254740993,"n":1}\n' + "line\n".repeat(100_000);
    const renderer = await mount(<ReasoningActivity {...thought(source, "streaming")} />);
    await press(renderer, "Expand Thinking");
    const shown = renderer.root.findByProps({ selectable: true });
    expect(text(shown)).toBe(source.split("\n").slice(0, 20).join("\n"));
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Show all"]);
    expect(useSyntaxTokens).not.toHaveBeenCalled();
    await press(renderer, "Show all");
    expect(text(renderer.root.findByProps({ selectable: true }))).toBe(source);
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Show less"]);
  });
  it("preserves Thinking disclosure and Show all through streaming, completion and reopening", async () => {
    const source = "line\n".repeat(30);
    const renderer = await mount(<ReasoningActivity {...thought(source, "streaming")} />);
    await press(renderer, "Expand Thinking"); await press(renderer, "Show all");
    await act(async () => renderer.update(<ReasoningActivity {...thought(source + "TAIL", "streaming")} />));
    expect(text(renderer.root.findByProps({ selectable: true }))).toBe(source + "TAIL");
    await press(renderer, "Collapse Thinking");
    await act(async () => renderer.update(<ReasoningActivity {...thought(source + "FINAL")} />));
    expect(buttons(renderer)).toEqual(["Expand Thinking"]);
    await press(renderer, "Expand Thinking");
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Show less"]);
    expect(text(renderer.root.findByProps({ selectable: true }))).toBe(source + "FINAL");
    await press(renderer, "Show less");
    expect(displayed(renderer)).not.toContain("FINAL");
  });
  it("keeps sibling tool/Thinking cards independent and avoids overlap compensation", async () => {
    const renderer = await mount(<><ReasoningActivity {...thought("first")} />
      <ToolActivity {...props(data({}, "second", "failed"))} /><ReasoningActivity {...thought("third")} /></>);
    const thoughts = renderer.root.findAllByProps({ accessibilityLabel: "Expand Thinking" });
    await act(async () => thoughts[0]!.props.onPress());
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Expand tool", "Expand Thinking"]);
    expect(displayed(renderer)).toContain("first"); expect(displayed(renderer)).not.toContain("third");
    for (const header of renderer.root.findAllByProps({ accessibilityRole: "button" })) {
      const style = header.props.style({ pressed: false })[0];
      expect(style.minHeight).toBe(16);
      expect(style).not.toHaveProperty("height");
      expect(style).not.toHaveProperty("marginTop"); expect(style).not.toHaveProperty("marginBottom");
      expect(style).not.toHaveProperty("transform"); expect(style).not.toHaveProperty("position");
    }
    const failed = renderer.root.findAll(node => String(node.type) === "Text" && node.children.includes("Failed"))[0]!;
    expect(failed.props.style[0]).not.toHaveProperty("lineHeight");
  });
  it.each(["running", "completed", "failed", "canceled"] as const)("starts %s calls collapsed", async status => {
    const renderer = await mount(<ToolActivity {...props(data({}, "hidden", status))} />);
    expect(buttons(renderer)).toEqual(["Expand tool"]);
    expect(displayed(renderer)).not.toContain("hidden");
    expect(useSyntaxTokens).not.toHaveBeenCalled();
    const header = renderer.root.findByProps({ accessibilityLabel: "Expand tool" });
    expect(header.props.style({ pressed: false })[0].minHeight).toBe(16);
    const title = renderer.root.findAll(node => String(node.type) === "Text" && node.children.includes("tool"))[0]!;
    expect(title.props.style).toMatchObject({ fontSize: 14 });
    expect(title.props.style).not.toHaveProperty("lineHeight");
    expect(title.props.allowFontScaling).not.toBe(false);
    expect(renderer.root.findByType("Icon" as React.ElementType).props.size).toBe(12);
    if (status === "running") {
      expect(renderer.root.findByProps({ accessibilityLabel: "Running" }).props.style).toMatchObject({ width: 14, height: 14 });
    }
  });
  it.each(["tool", "exec", "exec_command", "mcp__other__custom"])("uses only Input/Output and one shared Show all for %s", async name => {
    const input = { args: Array.from({ length: 25 }, (_, i) => i) };
    const output = { items: Array.from({ length: 25 }, (_, i) => i), last: "TAIL" };
    const value = data(input, output, "completed", name);
    const renderer = await mount(<ToolActivity {...props(value)} />);
    await press(renderer, "Expand " + name);
    expect(buttons(renderer)).toEqual(["Collapse " + name, "Show all"]);
    expect(displayed(renderer)).toContain("Input");
    expect(displayed(renderer)).toContain("Output");
    expect(displayed(renderer)).not.toMatch(/Raw|Copy|Calls|Preview limit|TAIL/);
    const previews = renderer.root.findAllByProps({ selectable: true }).map(text);
    expect(previews).toHaveLength(2);
    expect(previews.map(value => value.split("\n").length)).toEqual([20, 20]);
    await press(renderer, "Show all");
    expect(buttons(renderer)).toEqual(["Collapse " + name, "Show less"]);
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual([
      presentValue(input).text, presentValue(output).text,
    ]);
    await press(renderer, "Show less");
    expect(displayed(renderer)).not.toContain("TAIL");
  });
  it("has no redundant controls for short values and shows null/false/zero", async () => {
    const renderer = await mount(<ToolActivity {...props(data(false, 0))} />);
    await press(renderer, "Expand tool");
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual(["false", "0"]);
    await act(async () => renderer.update(<ToolActivity {...props(data(null, null))} />));
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual(["null", "null"]);
  });
  it("preserves per-card disclosure and Show all through streaming, completion and collapse/reopen", async () => {
    const long = Array.from({ length: 40 }, (_, i) => "row " + i).join("\n");
    const renderer = await mount(<ToolActivity {...props(data({}, long, "running"))} />);
    await press(renderer, "Expand tool");
    await press(renderer, "Show all");
    await act(async () => renderer.update(<ToolActivity {...props(data({}, long + "\nTAIL", "running"))} />));
    expect(displayed(renderer)).toContain("TAIL");
    await press(renderer, "Collapse tool");
    await act(async () => renderer.update(<ToolActivity {...props(data({}, long + "\nFINAL", "completed"))} />));
    expect(buttons(renderer)).toEqual(["Expand tool"]);
    await press(renderer, "Expand tool");
    expect(buttons(renderer)).toEqual(["Collapse tool", "Show less"]);
    expect(displayed(renderer)).toContain("FINAL");
  });
  it("does not share expansion between sibling cards", async () => {
    const long = "line\n".repeat(30);
    const renderer = await mount(<><ToolActivity {...props(data({}, long, "running", "a"))} />
      <ToolActivity {...props(data({}, long, "running", "b"))} /></>);
    await press(renderer, "Expand a"); await press(renderer, "Show all");
    expect(buttons(renderer)).toEqual(["Collapse a", "Show less", "Expand b"]);
  });
  it("keeps received metadata, traces, attachments and error fields available in Output", async () => {
    const output = { content: [{ type: "image", data: "base64-kept" }], details: {
      traces: Array.from({ length: 30 }, (_, i) => ({ i })), last: "metadata-tail",
    } };
    const value = { ...data({}, output, "failed", "exec"), error: { message: "actual-error", code: 2 } };
    const renderer = await mount(<ToolActivity {...props(value)} />);
    await press(renderer, "Expand exec"); await press(renderer, "Show all");
    const outputText = renderer.root.findAllByProps({ selectable: true }).map(text)[1]!;
    expect(JSON.parse(outputText)).toEqual({ output, error: value.error });
    expect(displayed(renderer)).not.toContain("Exit code:");
  });
  it("keeps actual newlines in selectable highlighted text for copying", async () => {
    vi.mocked(useSyntaxTokens).mockImplementation((code, _language, colors) =>
      code.split("\n").map(content => content ? [{ content, color: colors.foreground }] : []));
    const output = '\nline one\r\n中文 🐈\n\n';
    const renderer = await mount(<ToolActivity {...props(data(undefined, output))} />);
    await press(renderer, "Expand tool");
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual([output]);
  });
  it("passes JSON to the same highlighter in preview and full modes, with current theme colors", async () => {
    const output = { rows: Array.from({ length: 30 }, (_, i) => i), bool: false, null: null };
    const value = data({ code: "text(1)" }, output, "running", "exec");
    const renderer = await mount(<ToolActivity {...props(value)} />);
    await press(renderer, "Expand exec");
    expect(vi.mocked(useSyntaxTokens).mock.calls.some(([source, lang]) => source === "text(1)" && lang === "javascript")).toBe(true);
    expect(vi.mocked(useSyntaxTokens).mock.calls.some(([source, lang]) => lang === "json" && source.split("\n").length === 20)).toBe(true);
    await press(renderer, "Show all");
    expect(vi.mocked(useSyntaxTokens).mock.calls.at(-1)).toEqual([presentValue(output).text, "json", props(value).theme.colors]);
    const changed = props(value);
    changed.theme = { ...changed.theme, colors: { ...changed.theme.colors, foreground: "#123456" } };
    await act(async () => renderer.update(<ToolActivity {...changed} />));
    expect(vi.mocked(useSyntaxTokens).mock.calls.at(-1)?.[2].foreground).toBe("#123456");
  });
  it("clips the default preview without independent scrolling and removes the clip on Show all", async () => {
    const renderer = await mount(<ToolActivity {...props(data({}, "line\n".repeat(25)))} />);
    await press(renderer, "Expand tool");
    expect(previews(renderer)).toHaveLength(2);
    for (const preview of previews(renderer)) {
      expect(preview.props.scrollEnabled).toBe(platform === "web");
      expect(preview.props.style.overflow).toBe("hidden");
      expect(preview.props.showsVerticalScrollIndicator).toBe(false);
      expect(preview.props.style.maxHeight).toBe(20 * 19);
    }
    const header = renderer.root.findByProps({ accessibilityLabel: "Collapse tool" });
    expect(header.props.style({ pressed: false })[0].minHeight).toBe(16);
    expect(renderer.root.findAll(node => String(node.type) === "Text")
      .every(node => JSON.stringify(node.props.style).includes("color"))).toBe(true);
    await press(renderer, "Show all");
    expect(previews(renderer)).toHaveLength(0);
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)[1]).toBe("line\n".repeat(25));
  });
  it("shows one Show all when short JSON source lines wrap beyond twenty display lines", async () => {
    const input = { query: "a".repeat(3000) }, output = { text: "b".repeat(5000) };
    const value = data(input, output);
    const renderer = await mount(<ToolActivity {...props(value)} />);
    await press(renderer, "Expand tool");
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
    await measure(renderer, 0, 380);
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
    await measure(renderer, 1, 1520);
    expect(buttons(renderer)).toEqual(["Collapse tool", "Show all"]);
    await measure(renderer, 0, 760);
    await measure(renderer, 1, 38);
    expect(buttons(renderer)).toEqual(["Collapse tool", "Show all"]);
    await press(renderer, "Show all");
    expect(previews(renderer)).toHaveLength(0);
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual([
      presentValue(input).text, presentValue(output).text,
    ]);
    await press(renderer, "Show less");
    expect(previews(renderer)).toHaveLength(2);
  });
  it("updates wrapped overflow after resizing and clears an empty streaming section", async () => {
    const renderer = await mount(<ToolActivity {...props(data(undefined, "long value"))} />);
    await press(renderer, "Expand tool");
    await measure(renderer, 0, 760);
    expect(buttons(renderer)).toContain("Show all");
    await measure(renderer, 0, 19);
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
    await measure(renderer, 0, 760);
    await act(async () => renderer.update(<ToolActivity {...props(data(undefined, ""))} />));
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
  });
  it("scales the preview height with system text size without changing the twenty-line budget", async () => {
    vi.mocked(useWindowDimensions).mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    const renderer = await mount(<ToolActivity {...props(data({}, "text"))} />);
    await press(renderer, "Expand tool");
    expect(previews(renderer)[0]!.props.style.maxHeight).toBe(20 * 19 * 2);
    await measure(renderer, 1, 760);
    expect(buttons(renderer)).toEqual(["Collapse tool"]);
    await measure(renderer, 1, 798);
    expect(buttons(renderer)).toContain("Show all");
  });
  it("also bounds a single wrapped Thinking line and retains manual full state", async () => {
    const source = "没有换行的原文 🐈 ".repeat(500);
    const renderer = await mount(<ReasoningActivity {...thought(source, "streaming")} />);
    await press(renderer, "Expand Thinking");
    expect(previews(renderer)[0]!.props.style.maxHeight).toBe(20 * 20);
    await measure(renderer, 0, 800);
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Show all"]);
    await press(renderer, "Show all");
    expect(previews(renderer)).toHaveLength(0);
    await press(renderer, "Collapse Thinking");
    await act(async () => renderer.update(<ReasoningActivity {...thought(source + "TAIL")} />));
    await press(renderer, "Expand Thinking");
    expect(buttons(renderer)).toEqual(["Collapse Thinking", "Show less"]);
    expect(text(renderer.root.findByProps({ selectable: true }))).toBe(source + "TAIL");
  });
  it("shows waiting only for missing running output, and falls back cleanly during streaming", async () => {
    const renderer = await mount(<ToolActivity {...props(data(undefined, undefined, "running"))} />);
    await press(renderer, "Expand tool");
    expect(displayed(renderer)).toContain("Waiting for output…");
    const partial = '{"stream":';
    await act(async () => renderer.update(<ToolActivity {...props(data(undefined, partial, "running"))} />));
    expect(renderer.root.findAllByProps({ selectable: true }).map(text)).toEqual([partial]);
    expect(vi.mocked(useSyntaxTokens).mock.calls.at(-1)?.[1]).toBe("text");
    await act(async () => renderer.update(<ToolActivity {...props(data(undefined, '{"stream":true}', "completed"))} />));
    expect(vi.mocked(useSyntaxTokens).mock.calls.at(-1)?.[1]).toBe("json");
  });
  it("shows the call's main argument on the collapsed header, on one line", async () => {
    const renderer = await mount(<ToolActivity {...props(data({ path: "src/a.ts\nsecond" }, "x"))} />);
    const header = renderer.root.findByProps({ accessibilityLabel: "Expand tool" });
    expect(header.findAll(node => String(node.type) === "Text").map(text)).toEqual(["tool", "src/a.ts…"]);
    expect(header.findAll(node => String(node.type) === "Text").every(node => node.props.numberOfLines === 1)).toBe(true);
    await act(async () => renderer.update(<ToolActivity {...props(data({ limit: 2 }, "x"))} />));
    expect(header.findAll(node => String(node.type) === "Text").map(text)).toEqual(["tool"]);
  });
});
