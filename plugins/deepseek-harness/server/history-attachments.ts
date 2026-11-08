import type { AcpTransformer } from "@getpaseo/plugin/server/acp";
import type { ProviderPersistence } from "@getpaseo/plugin/server/provider";
import type { JsonValue } from "@getpaseo/protocol/agent-types";
import { historyAttachmentSchema, historyFileSchema, type readHistoryImage } from "../shared/history-attachments";
import type { RpcInput } from "@getpaseo/plugin";
import { readDshImageAttachment, resolveDshHome } from "./dsh-compatibility";

const homes = new Map<string, string>();
const images = new Map<string, { home: string; reference: typeof historyAttachmentSchema._output["attachment"] }>();
const imageKey = (sessionId: string, attachmentId: string) => `${sessionId}\0${attachmentId}`;

export function registerReplayHome(persistence: ProviderPersistence | undefined, env: Readonly<Record<string, string>>): void {
  const data = persistence?.data;
  if (data && typeof data === "object" && !Array.isArray(data) && typeof data.sessionId === "string") {
    homes.set(data.sessionId, resolveDshHome(env));
  }
}

export const historyAttachmentTransformer: AcpTransformer = {
  notification(notification) {
    if (notification.method !== "_dsh/history-attachment") return null;
    const params = notification.params;
    if (!params || typeof params !== "object" || Array.isArray(params)) return null;
    const update = params.update;
    if (!update || typeof update !== "object" || Array.isArray(update)) return null;
    const metadata = update._meta;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const payload = metadata["deepseek-harness"];
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    if (payload.type === "history-file") {
      const content = update.content;
      if (!content || typeof content !== "object" || Array.isArray(content)) return null;
      const file = historyFileSchema.safeParse({ name: content.name, uri: content.uri, bytes: content.size });
      if (!file.success) return null;
      return { type: "timeline", item: {
        type: "plugin", pluginId: "deepseek-harness", kind: "history-file", version: 1,
        id: `dsh-file:${String(payload.messageId ?? payload.toolCallId ?? payload.sessionId)}:${file.data.uri}`,
        data: file.data,
      } };
    }
    if (payload.type !== "history-attachment") return null;
    const parsed = historyAttachmentSchema.safeParse(payload);
    if (!parsed.success) return { type: "notice", notice: { id: "dsh-image-metadata", severity: "warning", title: "历史图片信息损坏", description: "会话已恢复，但这张图片无法定位。" } };
    const home = homes.get(parsed.data.sessionId);
    if (!home) return { type: "notice", notice: { id: "dsh-image-home", severity: "warning", title: "历史图片未加载", description: "缺少原会话的数据目录，请重新打开会话。" } };
    images.set(imageKey(parsed.data.sessionId, parsed.data.attachment.attachmentId), { home, reference: parsed.data.attachment });
    return {
      type: "timeline",
      item: {
        type: "plugin", pluginId: "deepseek-harness", kind: "history-attachment", version: 1,
        id: `dsh-image:${parsed.data.messageId ?? parsed.data.toolCallId ?? parsed.data.sessionId}:${parsed.data.attachment.attachmentId}`,
        data: parsed.data as unknown as JsonValue,
      },
    };
  },
};

export async function loadHistoryImage(input: RpcInput<typeof readHistoryImage>) {
  const registered = images.get(imageKey(input.sessionId, input.attachmentId));
  if (!registered) throw new Error("这张图片尚未从会话历史恢复，请重新打开会话。");
  const image = await readDshImageAttachment(registered.reference, { DSH_HOME: registered.home });
  return { data: image.bytes.toString("base64"), mimeType: image.mimeType };
}

export function clearHistoryAttachments(): void {
  homes.clear();
  images.clear();
}
