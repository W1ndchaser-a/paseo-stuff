import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const imageReferenceSchema = z.object({
  attachmentId: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  mediaType: z.string().startsWith("image/"),
  bytes: z.number().int().nonnegative(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  name: z.string().optional(),
});

export const historyAttachmentSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().optional(),
  toolCallId: z.string().optional(),
  attachment: imageReferenceSchema,
});

export const historyFileSchema = z.object({
  name: z.string(),
  uri: z.string().startsWith("file://"),
  bytes: z.number().nonnegative(),
});

export const readHistoryImage = defineRpc({
  name: "history.read-image",
  input: z.object({
    sessionId: z.string().min(1),
    attachmentId: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  }),
  output: z.object({ data: z.string(), mimeType: z.string().startsWith("image/") }),
});
