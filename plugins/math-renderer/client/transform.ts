import type { PluginTimelineTransformerContribution } from "@getpaseo/plugin/client";
import { MATH_KIND } from "../shared/contracts";
import { parseDocument } from "../shared/markdown";

export const transformMessage: PluginTimelineTransformerContribution<"assistant_message">["transform"] = ({ item, phase }) => {
  // 0.9 supplies the entire growing reply. Keep streaming native: a later image,
  // file link or size limit must not tear down an already interactive math card.
  // This also avoids parsing the whole document on every token update.
  if (phase === "streaming") return undefined;
  if (!/(?:\$|\\[[(]|(?:`{3,}|~{3,})[ \t]*math\b)/.test(item.text)) return undefined;
  const parsed = parseDocument(item.text);
  if (!parsed?.formulas) return undefined;
  // Let the host derive source identity; explicit IDs are plugin-global.
  return { items: [{ type: "plugin", kind: MATH_KIND, version: 1, data: { text: item.text } }] };
};
