import type { PluginClientContext } from "@getpaseo/plugin/client";
import { HistoryAttachment } from "./client/history-attachment";
import { HistoryFile } from "./client/history-file";
import { historyAttachmentSchema, historyFileSchema } from "./shared/history-attachments";

export default function contribute(client: PluginClientContext) {
  const removeImage = client.addTimelineRenderer({
    kind: "history-attachment",
    version: 1,
    schema: historyAttachmentSchema,
    Component: HistoryAttachment,
  });
  const removeFile = client.addTimelineRenderer({
    kind: "history-file", version: 1, schema: historyFileSchema, Component: HistoryFile,
  });
  return () => { removeImage(); removeFile(); };
}
