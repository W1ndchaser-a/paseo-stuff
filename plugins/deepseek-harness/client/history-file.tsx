import { Text, View } from "react-native";
import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import type { z } from "zod";
import type { historyFileSchema } from "../shared/history-attachments";

export function HistoryFile({ item, theme, layout }: PluginTimelineItemProps<z.infer<typeof historyFileSchema>>) {
  return (
    <View style={{ padding: layout.compact ? 10 : 14, gap: 6, borderRadius: 8, backgroundColor: theme.colors.surface0 }}>
      <Text style={{ color: theme.colors.foreground, fontWeight: "600" }}>历史文件 · {item.data.name}</Text>
      <Text style={{ color: theme.colors.foregroundMuted }}>{(item.data.bytes / 1024).toFixed(1)} KB · 原文件保留在服务器</Text>
      <Text selectable style={{ color: theme.colors.foreground }}>{item.data.uri}</Text>
    </View>
  );
}
