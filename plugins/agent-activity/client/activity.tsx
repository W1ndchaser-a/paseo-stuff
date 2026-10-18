import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon, ScrollView } from "@getpaseo/plugin/client/react-native";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from "react-native";
import { detailSections, presentValue, previewText, PREVIEW_LINES } from "../shared/details";
import { toolArgument } from "../shared/presentation";
import type { ReasoningItemData, ToolCallItemData } from "../shared/timeline";
import { useSyntaxTokens } from "./highlight";

type Theme = PluginTimelineItemProps["theme"];
type Layout = PluginTimelineItemProps["layout"];

function useStyles(theme: Theme, layout: Layout) {
  return useMemo(() => {
    const { colors } = theme;
    return {
      row: { minWidth: 0 } satisfies ViewStyle,
      // Native 0.8 labels use 14px with natural leading on every platform.
      // Host plugin rows already add 16px between cards: don't add a mobile
      // 44px minimum on top. Let larger system text grow the header naturally.
      header: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0,
        minHeight: 16, paddingHorizontal: 2,
        paddingVertical: 0, borderRadius: 4 } satisfies ViewStyle,
      title: { color: colors.foreground, fontSize: 14,
        flexShrink: 1, minWidth: 0 } satisfies TextStyle,
      // The argument gives way first, so a long command never hides the tool name.
      argument: { color: colors.foregroundMuted, fontFamily: "monospace", fontSize: 12,
        flex: 1, flexShrink: 100, minWidth: 0 } satisfies TextStyle,
      body: { marginLeft: 20, paddingTop: 4, paddingBottom: 8, gap: 12, minWidth: 0 } satisfies ViewStyle,
      section: { gap: 5, minWidth: 0 } satisfies ViewStyle,
      label: { color: colors.foregroundMuted, fontSize: 11, lineHeight: 18 } satisfies TextStyle,
      status: { color: colors.foregroundMuted, fontSize: 11 } satisfies TextStyle,
      action: { alignSelf: "flex-start", paddingHorizontal: 5,
        minHeight: layout.compact ? 44 : 24, paddingVertical: layout.compact ? 12 : 3, borderRadius: 3 } satisfies ViewStyle,
      code: { backgroundColor: colors.surface1, padding: 10, borderRadius: 4, minWidth: "100%" } satisfies ViewStyle,
      codeText: { color: colors.foreground, fontFamily: "monospace", fontSize: 12, lineHeight: 19 } satisfies TextStyle,
    };
  }, [theme, layout.compact]);
}
type Styles = ReturnType<typeof useStyles>;

function Button({ label, children, onPress, theme, style, expanded }: {
  label: string; children: ReactNode; onPress: () => void; theme: Theme; style: ViewStyle; expanded: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ expanded }} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [style, (hovered || pressed) && { backgroundColor: theme.colors.surface1 },
      focused && { outlineColor: theme.colors.accent, outlineWidth: 1, outlineStyle: "solid" }]}>
    {children}
  </Pressable>;
}

/** Measure natural content, but don't let the preview become a nested scroll owner. */
function Preview({ all, lineHeight, onOverflow, children }: {
  all: boolean; lineHeight: number; onOverflow: (overflow: boolean) => void; children: ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const maxHeight = PREVIEW_LINES * lineHeight * fontScale;
  // RN Web's scrollEnabled=false also cancels ancestor wheel/touch gestures.
  // Hidden overflow prevents web scrolling without intercepting the host scroll.
  return all ? children : <ScrollView scrollEnabled={Platform.OS === "web"}
    showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
    style={{ maxHeight, flexGrow: 0, overflow: "hidden" }}
    onContentSizeChange={(_width, height) => onOverflow(height > maxHeight + 0.5)}>
    {children}
  </ScrollView>;
}

function CodeContent({ text, language, theme, styles, all, onOverflow }: {
  text: string; language: string; theme: Theme; styles: Styles;
  all: boolean; onOverflow: (overflow: boolean) => void;
}) {
  const tokens = useSyntaxTokens(text, language, theme.colors);
  const wrap = language === "text" || language === "json";
  const content = <View style={[styles.code, wrap && { minWidth: 0, width: "100%" }]}>
    {/* One selectable text, including real newline characters, keeps copying faithful. */}
    <Preview all={all} lineHeight={styles.codeText.lineHeight} onOverflow={onOverflow}>
      <Text selectable style={styles.codeText}>
        {tokens ? tokens.map((line, index) => <Fragment key={index}>
          {index > 0 ? "\n" : null}
          {line.map((token, tokenIndex) => <Text key={tokenIndex}
            style={{ color: token.color ?? theme.colors.foreground }}>{token.content}</Text>)}
        </Fragment>) : text}
      </Text>
    </Preview>
  </View>;
  return wrap ? content : <ScrollView horizontal nestedScrollEnabled
    contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>;
}

function Details({ data, all, toggleAll, theme, styles }: {
  data: ToolCallItemData; all: boolean; toggleAll: () => void; theme: Theme; styles: Styles;
}) {
  const [inputOverflow, setInputOverflow] = useState(false);
  const [outputOverflow, setOutputOverflow] = useState(false);
  const sections = useMemo(() => detailSections(data).map(section => {
    const full = presentValue(section.value, section.language);
    return { ...section, full, preview: previewText(full.text) };
  }), [data]);
  return <View style={styles.body}>
    {sections.map(section => <View key={section.label} style={styles.section}>
      <Text style={styles.label}>{section.label}</Text>
      {section.full.text === "" ? <Text style={styles.label}>
        {data.status === "running" && section.label === "Output" && section.value === undefined
          ? "Waiting for output…" : "Empty"}
      </Text> : <CodeContent text={all ? section.full.text : section.preview.text}
        language={section.full.language} theme={theme} styles={styles} all={all}
        onOverflow={section.label === "Input" ? setInputOverflow : setOutputOverflow} />}
    </View>)}
    {all || sections.some(section => section.preview.truncated || (section.full.text !== ""
      && (section.label === "Input" ? inputOverflow : outputOverflow))) ? <Button
      label={all ? "Show less" : "Show all"} expanded={all} onPress={toggleAll}
      theme={theme} style={styles.action}><Text style={styles.label}>{all ? "Show less" : "Show all"}</Text></Button> : null}
  </View>;
}

export function ToolActivity({ item, theme, layout }: PluginTimelineItemProps<ToolCallItemData>) {
  const styles = useStyles(theme, layout);
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const data = item.data;
  const argument = useMemo(() => toolArgument(data.detail), [data.detail]);
  return <View style={styles.row}>
    <Button label={(expanded ? "Collapse " : "Expand ") + data.name} expanded={expanded}
      onPress={() => setExpanded(value => !value)} theme={theme} style={styles.header}>
      <Icon name={data.presentation.icon} size={12} color={theme.colors.foregroundMuted} />
      <Text numberOfLines={1} style={styles.title}>{data.name}</Text>
      {argument ? <Text numberOfLines={1} style={styles.argument}>{argument}</Text> : <View style={{ flex: 1 }} />}
      {data.status === "running" ? <ActivityIndicator accessibilityLabel="Running"
        color={theme.colors.foregroundMuted} size="small"
        style={{ width: 14, height: 14, transform: [{ scale: 0.65 }] }} />
        : data.status === "failed" ? <Text style={[styles.status, { color: theme.colors.statusDanger }]}>Failed</Text>
        : data.status === "canceled" ? <Text style={styles.status}>Canceled</Text> : null}
    </Button>
    {expanded ? <Details data={data} all={all} toggleAll={() => setAll(value => !value)}
      theme={theme} styles={styles} /> : null}
  </View>;
}

/** Minimal density adapter, not the former Markdown/reasoning presentation. */
export function ReasoningActivity({ item, theme, layout }: PluginTimelineItemProps<ReasoningItemData>) {
  const styles = useStyles(theme, layout);
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const preview = expanded && !all ? previewText(item.data.text) : { text: "", truncated: false };
  return <View style={styles.row}>
    <Button label={expanded ? "Collapse Thinking" : "Expand Thinking"} expanded={expanded}
      onPress={() => setExpanded(value => !value)} theme={theme} style={styles.header}>
      <Icon name="Brain" size={12} color={theme.colors.foregroundMuted} />
      <Text numberOfLines={1} style={[styles.title, { color: theme.colors.foregroundMuted }]}>Thinking</Text>
      <View style={{ flex: 1 }} />
      {item.data.phase === "streaming" ? <ActivityIndicator accessibilityLabel="Running"
        color={theme.colors.foregroundMuted} size="small"
        style={{ width: 14, height: 14, transform: [{ scale: 0.65 }] }} /> : null}
    </Button>
    {expanded ? <View style={styles.body}>
      <Preview all={all} lineHeight={20} onOverflow={setOverflow}>
        <Text selectable style={{ color: theme.colors.foreground, fontSize: 13, lineHeight: 20 }}>
          {all ? item.data.text : preview.text}
        </Text>
      </Preview>
      {all || preview.truncated || (item.data.text !== "" && overflow) ? <Button label={all ? "Show less" : "Show all"} expanded={all}
        onPress={() => setAll(value => !value)} theme={theme} style={styles.action}>
        <Text style={styles.label}>{all ? "Show less" : "Show all"}</Text>
      </Button> : null}
    </View> : null}
  </View>;
}
