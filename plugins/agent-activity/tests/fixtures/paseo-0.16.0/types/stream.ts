// Reduced copy of packages/app/src/types/stream.ts (v0.16.0): only its runtime export
// getStreamItemMessageId, verbatim. The full module pulls in parsers that the
// presentation pipeline does not use; the types it declares are erased anyway.
type StreamItem = { kind: string; id: string; sourceId?: string };

/** Find and scrolling address a plugin row by the source it replaces. */
export function getStreamItemMessageId(item: StreamItem): string {
  if (item.kind === "plugin") return item.sourceId ?? item.id;
  return item.id;
}
