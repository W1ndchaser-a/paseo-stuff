import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRpc, type PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { historyAttachmentSchema, readHistoryImage } from "../shared/history-attachments";
import type { z } from "zod";

type Attachment = z.infer<typeof historyAttachmentSchema>;

export function HistoryAttachment({ item, theme, layout }: PluginTimelineItemProps<Attachment>) {
  const { sessionId, attachment } = item.data;
  const key = `${sessionId}:${attachment.attachmentId}`;
  const [image, setImage] = useState<{ key: string; uri: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const readImage = useRpc(readHistoryImage);
  const uri = image?.key === key ? image.uri : undefined;
  const loading = pending === key;
  const error = failure?.key === key ? failure.message : undefined;
  const name = attachment.name || "图片附件";
  const load = async () => {
    setPending(key);
    setFailure(null);
    try {
      const result = await readImage({ sessionId, attachmentId: attachment.attachmentId });
      setImage({ key, uri: `data:${result.mimeType};base64,${result.data}` });
    } catch (error) {
      setFailure({ key, message: error instanceof Error ? error.message : "无法读取历史图片" });
    } finally {
      setPending(current => current === key ? null : current);
    }
  };
  return (
    <View style={{ padding: layout.compact ? 10 : 14, gap: 8, borderRadius: 8, backgroundColor: theme.colors.surface0 }}>
      <Text style={{ color: theme.colors.foreground, fontWeight: "600" }}>历史图片 · {name}</Text>
      <Text style={{ color: theme.colors.foregroundMuted }}>{attachment.mediaType} · {(attachment.bytes / 1024).toFixed(1)} KB</Text>
      {uri ? (
        <>
          <Image
            source={{ uri }}
            accessibilityLabel={`恢复的历史图片：${name}`}
            resizeMode="contain"
            style={{ width: "100%", height: layout.compact ? 240 : 360 }}
            onError={() => setFailure({ key, message: "图片已读取，但当前客户端无法显示此格式。" })}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="收起历史图片" onPress={() => setImage(null)}>
            <Text style={{ color: theme.colors.foreground }}>收起图片</Text>
          </Pressable>
        </>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="查看历史图片" disabled={loading} onPress={load} style={{ paddingVertical: 8 }}>
          <Text style={{ color: theme.colors.foreground }}>{loading ? "正在读取图片…" : "查看历史图片"}</Text>
        </Pressable>
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.foreground }}>{error}</Text> : null}
    </View>
  );
}
