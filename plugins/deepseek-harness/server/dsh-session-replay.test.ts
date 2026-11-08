import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import type {
  AcpStream,
  AcpStreamMessage,
} from "@getpaseo/plugin/server/acp";
import {
  buildResumeReplayFrames,
  createAcpCompatibilityStream,
  decodeDshSessionRecords,
  dshRecordsToReplayFrames,
  locateDshSessionFile,
  resolveDshHome,
  type AcpStreamOwner,
} from "./dsh-compatibility";

type Record = { [key: string]: unknown };

// A minimal DSH v4 transcript: one user turn, an assistant reply with a thought
// and an answer block, and one bash tool call with its result.
const SAMPLE_RECORDS: Record[] = [
  {
    type: "user/message",
    seq: 8,
    data: {
      content: [{ type: "text", text: "hi" }],
      source: { kind: "user" },
      role: "user",
      id: "u1",
    },
  },
  {
    type: "assistant/message",
    seq: 14,
    data: {
      turn: 1,
      step: 1,
      message: {
        role: "assistant",
        content: [
          { type: "reasoning", text: "thinking" },
          { type: "text", text: "answer" },
        ],
        id: "a1",
      },
    },
  },
  {
    type: "tool/call",
    seq: 15,
    data: { turn: 1, step: 1, callId: "c1", name: "bash", arguments: '{"cmd":"ls"}' },
  },
  {
    type: "tool/result",
    seq: 16,
    data: {
      turn: 1,
      step: 1,
      message: {
        role: "tool",
        source: { kind: "tool", callId: "c1" },
        toolCallId: "c1",
        content: [{ type: "text", text: "out" }],
        isError: false,
        id: "r1",
      },
    },
  },
];

function updates(frames: AcpStreamMessage[]): Record[] {
  return frames.map((f) => (f as unknown as Record).params as Record).map(
    (p) => p.update as Record,
  );
}

describe("dshRecordsToReplayFrames", () => {
  it("maps a transcript to ordered session/update frames", () => {
    const frames = dshRecordsToReplayFrames(SAMPLE_RECORDS, "s1");
    for (const f of frames) {
      const record = f as unknown as Record;
      expect(record.jsonrpc).toBe("2.0");
      expect(record.method).toBe("session/update");
      expect((record.params as Record).sessionId).toBe("s1");
    }
    expect(updates(frames)).toEqual([
      {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "hi" },
        messageId: "u1",
      },
      {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: "thinking" },
        messageId: "a1:thought",
      },
      {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "answer" },
        messageId: "a1",
      },
      {
        sessionUpdate: "tool_call",
        toolCallId: "c1",
        name: "bash",
        title: "bash",
        status: "completed",
        rawInput: { cmd: "ls" },
        content: [{ type: "content", content: { type: "text", text: "out" } }],
        rawOutput: {
          content: [{ type: "content", content: { type: "text", text: "out" } }],
        },
      },
    ]);
  });

  it("orders by seq regardless of input order", () => {
    const shuffled = [...SAMPLE_RECORDS].reverse();
    const kinds = updates(dshRecordsToReplayFrames(shuffled, "s1")).map(
      (u) => u.sessionUpdate,
    );
    expect(kinds).toEqual([
      "user_message_chunk",
      "agent_thought_chunk",
      "agent_message_chunk",
      "tool_call",
    ]);
  });

  it("marks a failed tool result as failed", () => {
    const records: Record[] = [
      { type: "tool/call", seq: 1, data: { callId: "c9", name: "bash", arguments: "{}" } },
      {
        type: "tool/result",
        seq: 2,
        data: {
          message: {
            toolCallId: "c9",
            content: [{ type: "text", text: "boom" }],
            isError: true,
          },
        },
      },
    ];
    const [update] = updates(dshRecordsToReplayFrames(records, "s1"));
    expect(update.status).toBe("failed");
  });

  it("skips non-user messages and empty blocks", () => {
    const records: Record[] = [
      {
        type: "user/message",
        seq: 1,
        data: { role: "system", content: [{ type: "text", text: "sys" }], id: "x" },
      },
      {
        type: "assistant/message",
        seq: 2,
        data: { message: { content: [{ type: "text", text: "" }], id: "a" } },
      },
    ];
    expect(dshRecordsToReplayFrames(records, "s1")).toEqual([]);
  });
});

describe("decodeDshSessionRecords", () => {
  it("decodes a zstd-compressed jsonl session store", () => {
    const jsonl = SAMPLE_RECORDS.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const bytes = zstdCompressSync(Buffer.from(jsonl, "utf8"));
    expect(decodeDshSessionRecords(bytes)).toEqual(SAMPLE_RECORDS);
  });

  it("skips blank and malformed lines", () => {
    const jsonl = '{"type":"a","seq":1}\n\nnot-json\n{"type":"b","seq":2}\n';
    const bytes = zstdCompressSync(Buffer.from(jsonl, "utf8"));
    expect(decodeDshSessionRecords(bytes)).toEqual([
      { type: "a", seq: 1 },
      { type: "b", seq: 2 },
    ]);
  });

  it("decodes concatenated zstd frames, as DSH appends them", () => {
    // DSH writes one zstd frame per appended record; a one-shot decode would
    // only see the first. Each record is compressed into its own frame here.
    const bytes = Buffer.concat(
      SAMPLE_RECORDS.map((r) =>
        zstdCompressSync(Buffer.from(JSON.stringify(r) + "\n", "utf8")),
      ),
    );
    expect(decodeDshSessionRecords(bytes)).toEqual(SAMPLE_RECORDS);
  });
});

describe("resolveDshHome", () => {
  it("prefers env DSH_HOME, then process env, then ~/.dsh", () => {
    expect(resolveDshHome({ DSH_HOME: "/custom" })).toBe("/custom");
    expect(resolveDshHome({})).toMatch(/\.dsh$|^.+$/);
  });
});

describe("locateDshSessionFile", () => {
  it("finds a session file by id across cwd-key directories", () => {
    const home = mkdtempSync(join(tmpdir(), "dsh-home-"));
    const dir = join(home, "sessions", "--some-cwd--", "sess-7");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "session.v4.jsonl.zstd");
    writeFileSync(file, zstdCompressSync(Buffer.from("{}\n")));
    expect(locateDshSessionFile(home, "sess-7")).toBe(file);
    expect(locateDshSessionFile(home, "missing")).toBeUndefined();
    expect(locateDshSessionFile("/no/such/home", "sess-7")).toBeUndefined();
  });
});

describe("buildResumeReplayFrames", () => {
  it("reads a real store and returns replay frames", async () => {
    const home = mkdtempSync(join(tmpdir(), "dsh-home-"));
    const dir = join(home, "sessions", "--cwd--", "sess-9");
    mkdirSync(dir, { recursive: true });
    const jsonl = SAMPLE_RECORDS.map((r) => JSON.stringify(r)).join("\n") + "\n";
    writeFileSync(
      join(dir, "session.v4.jsonl.zstd"),
      zstdCompressSync(Buffer.from(jsonl, "utf8")),
    );
    const frames = await buildResumeReplayFrames("sess-9", {
      cwd: "/cwd",
      env: { DSH_HOME: home },
    });
    expect(updates(frames).map((u) => u.sessionUpdate)).toEqual([
      "user_message_chunk",
      "agent_thought_chunk",
      "agent_message_chunk",
      "tool_call",
    ]);
  });

  it("returns an empty replay when the session is absent", async () => {
    const frames = await buildResumeReplayFrames("nope", {
      cwd: "/cwd",
      env: { DSH_HOME: "/no/such/home" },
    });
    expect(frames).toEqual([]);
  });
});

interface MemoryTransport {
  source: AcpStream;
  input: ReadableStreamDefaultController<AcpStreamMessage>;
  writes: AcpStreamMessage[];
  owner: AcpStreamOwner;
}

function memoryTransport(): MemoryTransport {
  let input: ReadableStreamDefaultController<AcpStreamMessage> | undefined;
  const writes: AcpStreamMessage[] = [];
  const source: AcpStream = {
    readable: new ReadableStream<AcpStreamMessage>({
      start(controller) {
        input = controller;
      },
    }),
    writable: new WritableStream<AcpStreamMessage>({
      write(message) {
        writes.push(message);
      },
    }),
  };
  const owner: AcpStreamOwner = {
    close: vi.fn(async () => undefined),
    onFailure: () => () => undefined,
  };
  return {
    source,
    input: input as ReadableStreamDefaultController<AcpStreamMessage>,
    writes,
    owner,
  };
}

function frame(value: unknown): AcpStreamMessage {
  return value as AcpStreamMessage;
}

describe("createAcpCompatibilityStream resume replay", () => {
  it("injects the transcript before the resume response", async () => {
    const home = mkdtempSync(join(tmpdir(), "dsh-home-"));
    const dir = join(home, "sessions", "--cwd--", "native-1");
    mkdirSync(dir, { recursive: true });
    const jsonl = SAMPLE_RECORDS.map((r) => JSON.stringify(r)).join("\n") + "\n";
    writeFileSync(
      join(dir, "session.v4.jsonl.zstd"),
      zstdCompressSync(Buffer.from(jsonl, "utf8")),
    );

    const transport = memoryTransport();
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      { cwd: "/cwd", env: { DSH_HOME: home } },
    );
    const writer = managed.writable.getWriter();
    const reader = managed.readable.getReader();

    await writer.write(
      frame({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    );
    transport.input.enqueue(
      frame({
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: 1,
          agentCapabilities: { sessionCapabilities: { resume: {} } },
        },
      }),
    );
    await reader.read(); // initialize response

    await writer.write(
      frame({
        jsonrpc: "2.0",
        id: 2,
        method: "session/load",
        params: { sessionId: "native-1", cwd: "/cwd", mcpServers: [] },
      }),
    );
    // DSH translates to resume and answers without replaying any history.
    transport.input.enqueue(
      frame({ jsonrpc: "2.0", id: 2, result: {} }),
    );

    const seen: AcpStreamMessage[] = [];
    for (let i = 0; i < 5; i += 1) {
      const next = await reader.read();
      if (next.done) break;
      seen.push(next.value);
      const record = next.value as unknown as Record;
      if (record.id === 2 && "result" in record) break;
    }

    const kinds = seen
      .filter((m) => (m as unknown as Record).method === "session/update")
      .map((m) => ((m as unknown as Record).params as Record).update as Record)
      .map((u) => u.sessionUpdate);
    expect(kinds).toEqual([
      "user_message_chunk",
      "agent_thought_chunk",
      "agent_message_chunk",
      "tool_call",
    ]);
    // The resume response is the last frame, after the whole replay.
    const last = seen[seen.length - 1] as unknown as Record;
    expect(last.id).toBe(2);
    expect("result" in last).toBe(true);

    await managed.close();
  });

  it("still delivers the resume response when the store is missing", async () => {
    const transport = memoryTransport();
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      { cwd: "/cwd", env: { DSH_HOME: "/no/such/home" } },
    );
    const writer = managed.writable.getWriter();
    const reader = managed.readable.getReader();

    await writer.write(
      frame({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    );
    transport.input.enqueue(
      frame({
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: 1,
          agentCapabilities: { sessionCapabilities: { resume: {} } },
        },
      }),
    );
    await reader.read();

    await writer.write(
      frame({
        jsonrpc: "2.0",
        id: 2,
        method: "session/load",
        params: { sessionId: "ghost", cwd: "/cwd", mcpServers: [] },
      }),
    );
    transport.input.enqueue(frame({ jsonrpc: "2.0", id: 2, result: {} }));

    const next = await reader.read();
    const record = next.value as unknown as Record;
    expect(record.id).toBe(2);
    expect("result" in record).toBe(true);

    await managed.close();
  });
});
