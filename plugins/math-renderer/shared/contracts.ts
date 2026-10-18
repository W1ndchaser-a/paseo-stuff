import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const MAX_TEXT = 96_000;
export const MAX_FORMULAS = 64;
export const MAX_TEX = 4096;
export const renderInput = z.object({
  tex: z.string().trim().min(1).max(MAX_TEX),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  fontSize: z.number().int().min(12).max(28),
  scale: z.number().int().min(1).max(3),
  display: z.boolean(),
}).strict();
export const renderOutput = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    uri: z.string().max(1_400_000).startsWith("data:image/png;base64,"),
    width: z.number().positive().max(2400),
    height: z.number().positive().max(800),
    // Pixels of the image below the text baseline, for inline alignment.
    depth: z.number().min(0).max(800),
  }),
  z.object({ ok: z.literal(false), reason: z.string().max(200) }),
]);
export type RenderInput = z.output<typeof renderInput>;
export type RenderOutput = z.output<typeof renderOutput>;
export const renderMath = defineRpc({ name: "math.render", input: renderInput, output: renderOutput });
export const messageData = z.object({ text: z.string().max(MAX_TEXT) });
export const MATH_KIND = "block-math-message";
