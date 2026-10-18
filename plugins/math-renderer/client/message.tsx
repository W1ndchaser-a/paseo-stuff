import { useMemo, useState, type ReactNode } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import type { PluginHostProps, PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { openExternalUrl, useRpc } from "@getpaseo/plugin/client";
import { copyText, ScrollView, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { renderInput, renderMath, type RenderInput } from "../shared/contracts";
import { parseDocument, type Block, type Inline } from "../shared/markdown";

type PluginTheme = PluginHostProps["theme"];

function Action({ label, onPress, theme, compact }: {
  label: string; onPress(): void; theme: PluginTheme; compact: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={{ minHeight: compact ? 44 : 28, paddingHorizontal: 8, justifyContent: "center" }}>
    <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{label}</Text>
  </Pressable>;
}
function useCopy() {
  const toast = useToast();
  return async (text: string) => {
    try { await copyText(text); toast.show("Copied", { variant: "success" }); }
    catch { toast.error("Copy failed. Select the source text to copy it."); }
  };
}
function FormulaImage({ uri, width, height, fallback }: { uri: string; width: number; height: number; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => ({ uri }), [uri]);
  return failed ? fallback : <Image source={source} resizeMode="contain" accessible={false}
    style={{ width, height }} onError={() => setFailed(true)} />;
}
function useFormula(tex: string, theme: PluginTheme, size: number, display: boolean, source: boolean) {
  const rpc = useRpc(renderMath);
  const { fontScale, scale } = useWindowDimensions();
  const input: RenderInput = {
    tex, color: theme.colors.foreground, display,
    fontSize: Math.max(12, Math.min(28, Math.round(size * fontScale))),
    scale: Math.max(1, Math.min(3, Math.ceil(scale))),
  };
  const valid = renderInput.safeParse(input).success;
  const query = useQuery({
    queryKey: ["math-renderer-v2", input], queryFn: () => rpc(input),
    enabled: valid && !source, staleTime: Infinity, gcTime: 60_000, retry: false,
  });
  return { valid, query };
}
export function Formula({ tex, raw, theme, compact }: { tex: string; raw: string; theme: PluginTheme; compact: boolean }) {
  const [source, setSource] = useState(false);
  const copy = useCopy();
  const { valid, query } = useFormula(tex, theme, 18, true, source);
  const result = query.data;
  const rawView = <Text selectable style={{ color: theme.colors.foreground, fontFamily: "monospace", fontSize: 14, lineHeight: 22 }}>{raw}</Text>;
  return <View testID="formula" style={{ gap: 6, marginVertical: 8, minWidth: 0 }}>
    <View accessibilityRole="image" accessibilityLabel={"Formula: " + tex}>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 2 }}>
        {!source && result?.ok
          ? <FormulaImage key={result.uri} uri={result.uri} width={result.width} height={result.height} fallback={rawView} />
          : rawView}
      </ScrollView>
    </View>
    <View testID="formula-actions" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
      <Action label={source ? "Show formula" : "Show LaTeX"} onPress={() => setSource(v => !v)} theme={theme} compact={compact} />
      <Action label="Copy LaTeX" onPress={() => { void copy(tex); }} theme={theme} compact={compact} />
      {!source && (!valid || query.isError || (result && !result.ok)) ?
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Unable to render · Source preserved</Text> :
        !source && query.isPending ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Rendering locally…</Text> : null}
      {!source && valid && !query.isFetching && (query.isError || (result && !result.ok)) ?
        <Action label="Retry" onPress={() => { void query.refetch(); }} theme={theme} compact={compact} /> : null}
    </View>
  </View>;
}

// Sits on the text baseline, lowered by the formula's depth. Tap to switch
// between the formula and its LaTeX source.
function InlineFormula({ tex, raw, theme }: { tex: string; raw: string; theme: PluginTheme }) {
  const [source, setSource] = useState(false);
  const { valid, query } = useFormula(tex, theme, 16, false, source);
  const result = query.data;
  const rawView = <Text onPress={valid ? () => setSource(false) : undefined}>{raw}</Text>;
  if (source || !result?.ok) return rawView;
  return <Text accessibilityRole="image" accessibilityLabel={"Formula: " + tex} onPress={() => setSource(true)}>
    <View style={{ width: result.width, height: result.height, transform: [{ translateY: result.depth }] }}>
      <FormulaImage key={result.uri} uri={result.uri} width={result.width} height={result.height} fallback={rawView} />
    </View>
  </Text>;
}

function InlineContent({ items, theme }: { items: Inline[]; theme: PluginTheme }): ReactNode {
  const toast = useToast();
  return items.map((item, i) => {
    // A word joiner keeps punctuation on the line of the formula before it.
    if (item.kind === "text") return items[i - 1]?.kind === "math" && /^[.,;:!?)\]}、，。；：！？）]/.test(item.text) ? "\u2060" + item.text : item.text;
    if (item.kind === "math") return <InlineFormula key={i} tex={item.tex} raw={item.raw} theme={theme} />;
    if (item.kind === "code") return <Text key={i} style={{ color: theme.colors.foreground, backgroundColor: theme.colors.surface1, fontFamily: "monospace" }}>{item.text}</Text>;
    if (item.kind === "link") return <Text key={i} accessibilityRole="link"
      style={{ color: theme.colors.accent, textDecorationLine: "underline" }}
      onPress={() => { void openExternalUrl(item.href).catch(() => toast.error("Could not open link")); }}>
      <InlineContent items={item.children} theme={theme} />
    </Text>;
    if (!("children" in item)) return null;
    return <Text key={i} style={{ color: theme.colors.foreground,
      fontWeight: item.kind === "strong" ? "600" : undefined,
      fontStyle: item.kind === "em" ? "italic" : undefined,
      textDecorationLine: item.kind === "strike" ? "line-through" : undefined }}>
      <InlineContent items={item.children} theme={theme} />
    </Text>;
  });
}
function Blocks({ blocks, theme, compact, prefix = "" }: { blocks: Block[]; theme: PluginTheme; compact: boolean; prefix?: string }) {
  return blocks.map((block, i) => {
    const key = prefix + i; // Position identity survives text/status updates and preserves manual source state.
    if (block.kind === "math") return <Formula key={key} tex={block.tex} raw={block.raw} theme={theme} compact={compact} />;
    if (block.kind === "rule") return <View key={key} style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 12 }} />;
    if (block.kind === "paragraph" || block.kind === "heading") return <Text key={key} selectable
      style={{ color: theme.colors.foreground, fontSize: block.kind === "heading" ? 23 - Math.min(block.level, 5) : 15,
        lineHeight: block.kind === "heading" ? 30 : 25, fontWeight: block.kind === "heading" ? "600" : "400", marginBottom: 10 }}>
      <InlineContent items={block.inline} theme={theme} />
    </Text>;
    if (block.kind === "code" || block.kind === "pending") return <View key={key}
      style={{ padding: 12, borderRadius: 6, backgroundColor: theme.colors.surface1, marginBottom: 10 }}>
      <Text selectable style={{ color: theme.colors.foreground, fontFamily: "monospace", fontSize: 13, lineHeight: 21 }}>{block.text}</Text>
    </View>;
    if (block.kind === "list") return <View key={key} style={{ marginBottom: 8 }}>
      {block.children.map((child, n) => <View key={n} style={{ flexDirection: "row", gap: 10 }}>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 15, lineHeight: 25 }}>{block.start ? block.start + n + "." : "•"}</Text>
        <View style={{ flex: 1, minWidth: 0 }}><Blocks blocks={[child]} theme={theme} compact={compact} prefix={key + ":" + n + ":"} /></View>
      </View>)}
    </View>;
    if (!("children" in block)) return null;
    return <View key={key} style={block.kind === "quote" ? { borderLeftWidth: 2, borderLeftColor: theme.colors.border, paddingLeft: 14, marginVertical: 8 } : undefined}>
      <Blocks blocks={block.children} theme={theme} compact={compact} prefix={key + ":"} />
    </View>;
  });
}

export function MathMessage({ item, theme, layout }: PluginTimelineItemProps<{ text: string }>) {
  const doc = useMemo(() => parseDocument(item.data.text), [item.data.text]);
  return <View testID="math-message" style={{ minWidth: 0 }}>
    {!doc ? <Text selectable style={{ color: theme.colors.foreground, fontSize: 14, lineHeight: 24 }}>{item.data.text}</Text> :
      <Blocks blocks={doc.blocks} theme={theme} compact={layout.compact} />}
  </View>;
}
