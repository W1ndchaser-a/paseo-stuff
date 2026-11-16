import { describe, expect, it } from "vitest";
import { createStreamPresentation, transformTimelineItem } from "./host";
import { transformReasoning, transformToolCall } from "../client/transform";

const tools = { id: "tools", query: { itemType: "tool_call" }, transform: transformToolCall };
const thoughts = { id: "thoughts", query: { itemType: "reasoning" }, transform: transformReasoning };
const using = timelineTransformers => input => transformTimelineItem({ ...input, plugins: [{ id: "activity", timelineTransformers }] });
// Tool cards mode registers both adapters; the native-rows command removes both.
const cards = using([tools, thoughts]);
const call = (id, status = "completed", name = "exec", detail = { type: "shell", command: id, output: id }, turnId) => ({
  id, kind: "tool_call", timestamp: new Date(0), ...(turnId ? { turnId } : {}), payload: { source: "agent", data: {
    provider: "pi", callId: id, name, status, error: status === "failed" ? "error" : null, detail,
  } },
});
const user = (id, turnId) => ({ id, kind: "user_message", text: id, timestamp: new Date(0), turnId });
const reply = (id, turnId) => ({ id, kind: "assistant_message", text: id, timestamp: new Date(0), turnId });
const thought = (id, turnId) => ({ id, kind: "thought", status: "ready", text: id, timestamp: new Date(0), turnId });
const agentMessage = (id, turnId) => ({
  ...call(id, "completed", "agent_message", { type: "plain_text", text: "From parent", icon: "bot" }, turnId),
  id, payload: { source: "agent", data: {
    provider: "pi", callId: "paseo-agent-message:" + id, name: "agent_message", status: "completed", error: null,
    detail: { type: "plain_text", text: "From parent", icon: "bot" },
    agentMessage: { event: "message", sender: { id: "parent", title: "Parent" }, text: "From parent" },
  } },
});
const heartbeat = (id, turnId) => call(id, "completed", "heartbeat", { type: "plain_text", text: "Check in", icon: "sparkles" }, turnId);
const present = ({ head = [], tail = [], display = "full", transform = cards, isTurnActive = head.length > 0, expanded = [] }) =>
  createStreamPresentation()({ head, tail, display, transform, isTurnActive, expandedTurnHostIds: new Set(expanded) });
const kinds = rows => rows.map(row => row.kind === "plugin" ? row.itemKind : row.kind);

describe("Paseo 0.16.0 actual presentation pipeline", () => {
  describe("Full", () => {
    it.each(["running", "completed", "failed", "canceled"])("retains all %s tool data", status => {
      const original = [call("one"), call("two", status)];
      const before = JSON.stringify(original);
      const { head } = present({ head: original });
      expect(head.map(item => item.data.detail.command)).toEqual(["one", "two"]);
      expect(head[1].data.status).toBe(status);
      expect(JSON.stringify(original)).toBe(before);
    });
    it("preserves source identity through live updates and history promotion", () => {
      const presentation = createStreamPresentation();
      const input = { display: "full", transform: cards, expandedTurnHostIds: new Set() };
      const first = presentation({ ...input, head: [call("one", "running")], tail: [], isTurnActive: true });
      const final = presentation({ ...input, head: [], tail: [call("one")], isTurnActive: false });
      expect(final.tail[0].id).toBe(first.head[0].id);
      expect(final.tail[0].data.status).toBe("completed");
    });
    it("keeps one source identity for streaming/final conversion snapshots and preserves sibling tools", () => {
      const code = call("code", "running", "exec", { type: "unknown", input: { code: "compose tools" }, output: {
        content: [], details: { cellId: "cell", status: "running", traces: [{
          id: "trace", name: "exec_command", input: { cmd: "npm test" }, status: "running",
        }] },
      } });
      const presentation = createStreamPresentation();
      const input = head => ({ head, tail: [], display: "full", transform: cards, isTurnActive: true, expandedTurnHostIds: new Set() });
      const before = presentation(input([code, call("plain")])).head;
      expect(before).toHaveLength(2);
      expect(before[0].data.detail.input.code).toBe("compose tools");
      expect(before[0].data).not.toHaveProperty("activity");
      const final = structuredClone(code);
      final.payload.data.status = "completed";
      Object.assign(final.payload.data.detail.output.details, { codeMode: true, status: "result" });
      final.payload.data.detail.output.details.traces[0].status = "done";
      const after = presentation(input([final, call("plain")])).head;
      expect(after.map(item => item.id)).toEqual(before.map(item => item.id));
      expect(after[0].data.detail).toEqual(final.payload.data.detail);
      expect(after[1].data.detail.command).toBe("plain");
    });
    it("keeps native speech and full accumulated reasoning", () => {
      const speech = call("speech", "completed", "speak", { type: "unknown", input: "Hello" });
      const streaming = { id: "thought", kind: "thought", status: "loading", text: "First\n\nSecond", timestamp: new Date(0) };
      const result = present({ head: [streaming, speech] });
      expect(result.head[0].data).toEqual({ text: streaming.text, phase: "streaming" });
      expect(result.head[1]).toEqual(speech);
    });
  });

  describe.each(["full", "collapseToolCalls", "collapseTurns"])("%s", display => {
    it("preserves native plan filtering and rendering", () => {
      const calls = [call("exit", "completed", "ExitPlanMode"), call("pending", "running", "plan_approval"),
        call("done", "completed", "plan_approval", { type: "plan", plan: "Keep native" }),
        call("rejected", "failed", "plan_approval", { type: "plan", plan: "Rejected" })];
      const native = present({ head: calls, display, transform: null });
      const custom = present({ head: calls, display });
      expect(custom.head).toEqual(native.head);
      expect(custom.head.map(item => item.id)).toEqual(["done", "rejected"]);
      expect(custom.head.every(item => item.kind === "tool_call")).toBe(true);
    });
    it("shows another agent's message as the host's user row", () => {
      const tail = [user("u1", "t1"), call("a", "completed", "exec", undefined, "t1"), call("b", "completed", "exec", undefined, "t1"),
        reply("r1", "t1"), agentMessage("m", "t2"), call("c", "completed", "exec", undefined, "t2"), reply("r2", "t2")];
      const native = present({ tail, display, transform: null });
      const custom = present({ tail, display });
      const row = custom.tail.find(item => item.id === "m");
      expect(row).toEqual(native.tail.find(item => item.id === "m"));
      expect(row).toMatchObject({ kind: "user_message", text: "From parent", sender: { id: "parent", title: "Parent" } });
    });
    it("keeps heartbeats native", () => {
      const beat = heartbeat("beat", "t1");
      const custom = present({ tail: [beat, call("a", "completed", "exec", undefined, "t1"), reply("r", "t1")], display });
      expect(custom.tail[0]).toEqual(beat);
    });
  });

  describe("Collapse tool calls", () => {
    it("documents card bypass of grouping, which native rows restore with thinking", () => {
      const tail = [user("u", "t"), thought("plan", "t"), call("one", "completed", "exec", undefined, "t"),
        thought("next", "t"), call("two", "completed", "exec", undefined, "t"), reply("r", "t")];
      const native = present({ tail, display: "collapseToolCalls", transform: null });
      expect(native.tail.map(item => item.id)).toEqual(["u", "plan", "r"]);
      expect(native.groupsByHostId.get("plan").run.calls.map(item => item.id)).toEqual(["plan", "one", "next", "two"]);
      const custom = present({ tail, display: "collapseToolCalls" });
      expect(kinds(custom.tail)).toEqual(["user_message", "colorful-reasoning", "colorful-tool-call",
        "colorful-reasoning", "colorful-tool-call", "assistant_message"]);
      expect(custom.groupsByHostId.size).toBe(0);
      // Keeping only the Thinking adapter would split the host group into lone calls.
      const thinkingOnly = present({ tail, display: "collapseToolCalls", transform: using([thoughts]) });
      expect(thinkingOnly.groupsByHostId.size).toBe(0);
      expect(kinds(thinkingOnly.tail).filter(kind => kind === "tool_call")).toHaveLength(2);
    });
    it("regroups existing history after switching to native rows", () => {
      const tail = [thought("plan"), call("one"), call("two")];
      const presentation = createStreamPresentation();
      const history = transform => presentation({ head: [], tail, display: "collapseToolCalls", transform, isTurnActive: false, expandedTurnHostIds: new Set() });
      expect(history(cards).groupsByHostId.size).toBe(0);
      const native = history(null);
      expect(native.tail).toHaveLength(1);
      expect(native.groupsByHostId.get(native.tail[0].id).run.calls.map(item => item.id)).toEqual(["plan", "one", "two"]);
      const restored = history(cards);
      expect(restored.groupsByHostId.size).toBe(0);
      expect(restored.tail.slice(1).map(item => item.data.detail.command)).toEqual(["one", "two"]);
    });
  });

  describe("Collapse turns", () => {
    const turn = [user("u", "t"), thought("plan", "t"), call("one", "completed", "exec", undefined, "t"),
      call("two", "completed", "exec", undefined, "t"), reply("r", "t")];
    it("folds a tool turn with native rows exactly as without the plugin", () => {
      const native = present({ tail: turn, display: "collapseTurns", transform: null });
      expect(native.tail.map(item => item.id)).toEqual(["u", "turn-summary:u", "r"]);
      expect(native.turns.summaryRowsByHostId.get("u").tools.thoughtCount).toBe(1);
    });
    it("documents that tool cards keep a tool-only turn open", () => {
      const custom = present({ tail: turn, display: "collapseTurns" });
      expect(custom.turns.summaryRowsByHostId.size).toBe(0);
      expect(kinds(custom.tail)).toEqual(["user_message", "colorful-reasoning", "colorful-tool-call", "colorful-tool-call", "assistant_message"]);
    });
    it("hides cards inside a turn that folds for an earlier reply", () => {
      const tail = [user("u", "t"), reply("ack", "t"), call("one", "completed", "exec", undefined, "t"), reply("r", "t")];
      const custom = present({ tail, display: "collapseTurns" });
      expect(custom.tail.map(item => item.id)).toEqual(["u", "turn-summary:u", "r"]);
      const opened = present({ tail, display: "collapseTurns", expanded: ["u"] });
      expect(kinds(opened.tail)).toEqual(["user_message", "turn_summary", "assistant_message", "colorful-tool-call", "assistant_message"]);
    });
    it("folds a turn started by another agent's message around its user row", () => {
      const tail = [agentMessage("m", "t"), call("one", "completed", "exec", undefined, "t"),
        call("two", "completed", "exec", undefined, "t"), reply("r", "t")];
      const native = present({ tail, display: "collapseTurns", transform: null });
      expect(native.tail.map(item => item.id)).toEqual(["m", "turn-summary:m", "r"]);
      expect(native.tail[0].kind).toBe("user_message");
      // Native rows fold it the same way; with cards the turn host is still the native row.
      const custom = present({ tail, display: "collapseTurns" });
      expect(custom.tail[0]).toEqual(native.tail[0]);
      const withAck = [tail[0], reply("ack", "t"), ...tail.slice(1)];
      expect(present({ tail: withAck, display: "collapseTurns" }).tail.map(item => item.id)).toEqual(["m", "turn-summary:m", "r"]);
      // Before beta.14 the message became a card, which is neither a user row nor a turn host.
      const legacy = present({ tail: withAck, display: "collapseTurns", transform: using([{ ...tools, transform: input => ({
        items: [{ type: "plugin", kind: "colorful-tool-call", version: 1, data: { name: input.item.name } }] }) }]) });
      expect(legacy.turns.summaryRowsByHostId.size).toBe(0);
    });
    it("keeps the latest turn open while it streams", () => {
      const live = present({ tail: turn.slice(0, -1), head: [reply("r", "t")], display: "collapseTurns", transform: null });
      expect(live.turns.summaryRowsByHostId.size).toBe(0);
    });
  });
});
