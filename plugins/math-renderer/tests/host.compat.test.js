import { describe, expect, it, vi } from "vitest";
import { createStreamPresentation, transformTimelineItem, ChatFindModel, getStreamItemMessageId } from "./host";
import { transformMessage } from "../client/transform";

const plugins = [{ id: "math", timelineTransformers: [
  { id: "math", query: { itemType: "assistant_message" }, transform: transformMessage },
] }];
const transform = input => transformTimelineItem({ ...input, plugins });
const message = (text, id = "answer", turnId) => ({ id, kind: "assistant_message", text, timestamp: new Date(0),
  timelineCursor: { epoch: "epoch", seq: 1 }, ...(turnId ? { turnId } : {}) });
const tool = (id, turnId) => ({ id, kind: "tool_call", timestamp: new Date(0), ...(turnId ? { turnId } : {}), payload: { source: "agent", data: {
  provider: "pi", callId: id, name: "exec", status: "completed", error: null, detail: { type: "shell", command: id, output: id },
} } });
const user = (id, turnId) => ({ id, kind: "user_message", text: id, timestamp: new Date(0), turnId });
const input = (head = [], tail = [], display = "full") =>
  ({ head, tail, display, transform, isTurnActive: head.length > 0, expandedTurnHostIds: new Set() });
const DISPLAYS = ["full", "collapseToolCalls", "collapseTurns"];

describe("Paseo 0.16.0 whole-message presentation", () => {
  it.each(DISPLAYS)("keeps streaming native and renders the whole completed reply with stable history identity (%s)", display => {
    const present = createStreamPresentation();
    const text = "Before\n\n$$x^2$$\n\nAfter";
    for (let n = 1; n <= text.length; n++) {
      const live = present(input([message(text.slice(0, n))], [], display));
      expect([...live.tail, ...live.head].every(item => item.kind === "assistant_message")).toBe(true);
    }
    const final = present(input([], [message(text)], display));
    expect(final.tail).toHaveLength(1);
    expect(final.tail[0].data.text).toBe(text);
    expect(final.tail[0].sourceId).toBe("answer");
    expect(final.tail[0].timelineCursor).toEqual({ epoch: "epoch", seq: 1 });
    expect(present(input([], [message(text)], display)).tail[0].id).toBe(final.tail[0].id);
  });
  it("renders a reply whose formula-free blocks use host-only Markdown", () => {
    const text = "$$x^2$$\n\n![plot](https://example.com/plot.png)\n\n[File](./file.ts)\n\n| a | b |\n|---|---|\n| 1 | 2 |";
    const rows = createStreamPresentation()(input([], [message(text)])).tail;
    expect(rows.map(row => row.kind)).toEqual(["plugin"]);
    expect(rows[0].data.text).toBe(text);
  });
  it.each([
    "Inline $x$ next to ![plot](https://example.com/plot.png)",
    "| $a$ | b |\n|---|---|\n| 1 | 2 |",
    "See [File](./file.ts) for $x$",
    "$$x^2$$\n\n" + "a".repeat(96000),
    Array(65).fill("$$x$$").join("\n\n"),
  ])("keeps unsupported or oversized whole replies native", text => {
    const source = message(text);
    const rows = createStreamPresentation()(input([], [source])).tail;
    expect(rows).toEqual([source]);
    expect(rows).toEqual(createStreamPresentation()({ ...input([], [source]), transform: null }).tail);
  });
  it.each(DISPLAYS)("leaves tools unchanged in %s", display => {
    const tail = [tool("one"), tool("two"), message("$$x$$")];
    const custom = createStreamPresentation()(input([], tail, display));
    const native = createStreamPresentation()({ ...input([], tail, display), transform: null });
    expect(custom.tail.slice(0, -1)).toEqual(native.tail.slice(0, -1));
    expect(custom.groupsByHostId.size).toBe(native.groupsByHostId.size);
  });
  it("lets Chat Find target the rendered row through its source message", async () => {
    vi.useFakeTimers();
    const source = message("$$x^2$$\n\nfind-me");
    const present = createStreamPresentation();
    const custom = present(input([], [source]));
    const native = present({ ...input([], [source]), transform: null });
    const reveal = vi.fn(async () => ({ occurrence: 0, count: 1 }));
    const model = new ChatFindModel({
      search: async () => ({ epoch: "epoch", locations: [{ seq: 1, role: "assistant", count: 1 }], nextCursor: null }),
      load: async () => {}, reveal, clear() {},
    });
    try {
      model.updateHistory("epoch", [source]); model.open(); model.setQuery("find-me");
      await vi.advanceTimersByTimeAsync(121);
      const target = reveal.mock.calls[0][0];
      expect(target).toBe(source.id);
      expect(custom.tail.map(item => item.kind)).toEqual(["plugin"]);
      expect(custom.tail.map(getStreamItemMessageId)).toEqual([target]);
      // Native-reply mode restores the source row, whose formula source is searchable text.
      expect(native.tail).toEqual([source]);
      expect(native.tail.map(getStreamItemMessageId)).toEqual([target]);
    } finally { model.close(); vi.useRealTimers(); }
  });

  describe("Collapse turns", () => {
    const turn = reply => [user("u", "t"), tool("one", "t"), tool("two", "t"), message(reply, "r", "t"), user("next", "n")];
    const present = (tail, mode = transform) =>
      createStreamPresentation()({ ...input([], tail, "collapseTurns"), transform: mode });
    it("folds a turn whose reply has no formula", () => {
      const result = present(turn("Plain answer"));
      expect(result.tail.map(item => item.id)).toEqual(["u", "turn-summary:u", "r", "next"]);
      expect(result.turns.summaryRowsByHostId.has("u")).toBe(true);
    });
    it("folds a completed formula reply while preserving its rendered row", () => {
      const result = present(turn("$x^2$"));
      expect(result.turns.summaryRowsByHostId.has("u")).toBe(true);
      expect(result.tail.map(item => item.kind)).toEqual(["user_message", "turn_summary", "plugin", "user_message"]);
      expect(result.tail[2]).toMatchObject({ sourceId: "r", sourceKind: "assistant_message" });
      const native = present(turn("$x^2$"), null);
      expect(native.tail.map(item => item.id)).toEqual(["u", "turn-summary:u", "r", "next"]);
    });
    it("folds through the final formula reply after an earlier native reply", () => {
      const tail = [user("u", "t"), tool("one", "t"), message("Checking.", "ack", "t"), tool("two", "t"),
        tool("three", "t"), message("$x^2$", "r", "t")];
      const result = present(tail);
      expect(result.turns.summaryRowsByHostId.has("u")).toBe(true);
      expect(result.tail.map(item => item.kind)).toEqual(["user_message", "turn_summary", "plugin"]);
    });
    it("keeps the latest formula reply native while it streams", () => {
      const live = createStreamPresentation()({ ...input([message("$$x^2", "r", "t")], turn("").slice(0, 3), "collapseTurns") });
      expect(live.head.map(item => item.kind)).toEqual(["assistant_message"]);
      expect(live.turns.summaryRowsByHostId.size).toBe(0);
    });
  });
});
