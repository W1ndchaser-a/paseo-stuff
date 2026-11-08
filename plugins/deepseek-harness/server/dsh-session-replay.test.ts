import { createHash } from "node:crypto";
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
  createAcpCompatibilityStream,
  locateDshSessionFile,
  readDshImageAttachment,
  replayDshSession,
  resolveDshHome,
  type AcpStreamOwner,
  type ManagedAcpStream,
  type ReplayNotice,
} from "./dsh-compatibility";
import { historyAttachmentSchema } from "../shared/history-attachments";

type Record = { [key: string]: unknown };

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
    data: {
      turn: 1,
      step: 1,
      callId: "c1",
      name: "bash",
      arguments: '{"cmd":"ls"}',
    },
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

function newHome(): string {
  return mkdtempSync(join(tmpdir(), "dsh-replay-"));
}

/** DSH appends one independently decodable zstd frame per record. */
function encodeStore(records: readonly Record[]): Buffer {
  return Buffer.concat(
    records.map((record) =>
      zstdCompressSync(Buffer.from(`${JSON.stringify(record)}\n`, "utf8")),
    ),
  );
}

function writeSession(
  home: string,
  sessionId: string,
  records: readonly Record[] | Buffer,
): string {
  const dir = join(home, "sessions", "--cwd--", sessionId);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "session.v4.jsonl.zstd");
  writeFileSync(
    file,
    Buffer.isBuffer(records) ? records : encodeStore(records),
  );
  return file;
}

async function collect(
  sessionId: string,
  env: Readonly<{ [key: string]: string }>,
  onNotice?: (notice: ReplayNotice) => void,
): Promise<AcpStreamMessage[]> {
  const frames: AcpStreamMessage[] = [];
  for await (const frame of replayDshSession(sessionId, {
    cwd: "/cwd",
    env,
    ...(onNotice ? { onReplayNotice: onNotice } : {}),
  })) {
    frames.push(frame);
  }
  return frames;
}

function updates(frames: readonly AcpStreamMessage[]): Record[] {
  const result: Record[] = [];
  for (const frame of frames) {
    const params = (frame as unknown as Record).params;
    if (typeof params !== "object" || params === null) {
      continue;
    }
    const update = (params as Record).update;
    if (typeof update === "object" && update !== null) {
      result.push(update as Record);
    }
  }
  return result;
}

function updateKinds(frames: readonly AcpStreamMessage[]): string[] {
  return updates(frames).map((update) => String(update.sessionUpdate));
}

function storeImage(home: string, data: Buffer): string {
  const hex = createHash("sha256").update(data).digest("hex");
  const dir = join(home, "attachments", "v1", "objects", hex.slice(0, 2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, hex), data);
  return hex;
}

describe("replayDshSession", () => {
  it("streams a transcript as ordered ACP session/update frames", async () => {
    const home = newHome();
    writeSession(home, "s1", SAMPLE_RECORDS);
    const frames = await collect("s1", { DSH_HOME: home });

    for (const frame of frames) {
      const record = frame as unknown as Record;
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
        kind: "other",
        status: "pending",
        rawInput: { cmd: "ls" },
        content: [],
      },
      {
        sessionUpdate: "tool_call_update",
        toolCallId: "c1",
        status: "completed",
        content: [{ type: "content", content: { type: "text", text: "out" } }],
        rawOutput: {
          content: [{ type: "content", content: { type: "text", text: "out" } }],
        },
      },
    ]);
  });

  it("decodes concatenated frames in file order and warns on seq regressions", async () => {
    const home = newHome();
    const notices: ReplayNotice[] = [];
    writeSession(home, "s1", [
      {
        type: "user/message",
        seq: 2,
        data: { role: "user", id: "u2", content: [{ type: "text", text: "two" }] },
      },
      {
        type: "user/message",
        seq: 1,
        data: { role: "user", id: "u1", content: [{ type: "text", text: "one" }] },
      },
    ]);
    const frames = await collect("s1", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(updates(frames).map((update) => (update.content as Record).text)).toEqual([
      "two",
      "one",
    ]);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.message).toContain("seq 1 after 2");
  });

  it("never turns an orphan tool call into completed", async () => {
    const home = newHome();
    const notices: ReplayNotice[] = [];
    writeSession(home, "s1", [
      {
        type: "tool/call",
        seq: 1,
        data: { turn: 1, step: 1, callId: "c-orphan", name: "bash", arguments: "{}" },
      },
      { type: "turn/end", seq: 2, data: { turn: 1, reason: { kind: "completed" } } },
    ]);
    const frames = await collect("s1", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(updates(frames)).toEqual([
      {
        sessionUpdate: "tool_call",
        toolCallId: "c-orphan",
        name: "bash",
        title: "bash",
        kind: "other",
        status: "pending",
        rawInput: {},
        content: [],
      },
    ]);
    expect(notices[0]?.message).toContain("has no stored result; left pending");
  });

  it("marks an orphan call failed when its turn was aborted", async () => {
    const home = newHome();
    writeSession(home, "s1", [
      {
        type: "tool/call",
        seq: 1,
        data: { turn: 2, step: 1, callId: "c-cancel", name: "bash", arguments: "{}" },
      },
      {
        type: "turn/end",
        seq: 2,
        data: { turn: 2, reason: { kind: "aborted", reason: { kind: "user" } } },
      },
    ]);
    const frames = await collect("s1", { DSH_HOME: home });
    expect(updateKinds(frames)).toEqual(["tool_call", "tool_call_update"]);
    expect(updates(frames)[1]?.status).toBe("failed");
  });

  it("marks a stored error result failed and preserves error evidence", async () => {
    const home = newHome();
    writeSession(home, "s1", [
      {
        type: "tool/call",
        seq: 1,
        data: { turn: 1, step: 1, callId: "c-error", name: "bash", arguments: "{}" },
      },
      {
        type: "tool/result",
        seq: 2,
        data: {
          turn: 1,
          step: 1,
          message: {
            role: "tool",
            source: { kind: "tool", callId: "c-error" },
            toolCallId: "c-error",
            content: [{ type: "text", text: "boom" }],
            isError: true,
            id: "r-error",
          },
          error: { name: "Error", code: "EXIT_1" },
        },
      },
    ]);
    const frames = await collect("s1", { DSH_HOME: home });
    expect(updateKinds(frames)).toEqual(["tool_call", "tool_call_update"]);
    expect(updates(frames)[1]?.status).toBe("failed");
  });

  it("warns once and resumes with an empty timeline when the store is missing", async () => {
    const home = newHome();
    const notices: ReplayNotice[] = [];
    const frames = await collect("ghost", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(frames).toEqual([]);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.sessionId).toBe("ghost");
    expect(notices[0]?.message).toContain("no stored DSH transcript");
  });

  it("reports malformed records and an incomplete trailing frame without dropping earlier history", async () => {
    const home = newHome();
    const notices: ReplayNotice[] = [];
    const first = zstdCompressSync(
      Buffer.from(
        `${JSON.stringify({
          type: "user/message",
          seq: 1,
          data: { role: "user", id: "u1", content: [{ type: "text", text: "kept" }] },
        })}\nnot-json\n`,
        "utf8",
      ),
    );
    const second = zstdCompressSync(
      Buffer.from(
        `${JSON.stringify({
          type: "user/message",
          seq: 2,
          data: { role: "user", id: "u2", content: [{ type: "text", text: "also kept" }] },
        })}\n`,
        "utf8",
      ),
    );
    const third = zstdCompressSync(
      Buffer.from(
        `${JSON.stringify({
          type: "user/message",
          seq: 3,
          data: { role: "user", id: "u3", content: [{ type: "text", text: "lost" }] },
        })}\n`,
        "utf8",
      ),
    );
    writeSession(
      home,
      "s1",
      Buffer.concat([first, second, third.subarray(0, third.length - 3)]),
    );
    const frames = await collect("s1", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(updates(frames).map((update) => (update.content as Record).text)).toEqual([
      "kept",
      "also kept",
    ]);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.message).toContain("not valid JSON");
    expect(notices[0]?.message).toContain("incomplete zstd frame");
  });

  it("stops at a corrupt frame boundary but keeps prior records", async () => {
    const home = newHome();
    const notices: ReplayNotice[] = [];
    const valid = encodeStore([
      {
        type: "user/message",
        seq: 1,
        data: { role: "user", id: "u1", content: [{ type: "text", text: "kept" }] },
      },
    ]);
    writeSession(home, "s1", Buffer.concat([valid, Buffer.from("garbage")]));
    const frames = await collect("s1", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(updates(frames)).toHaveLength(1);
    expect(notices[0]?.message).toContain("history replay stopped at byte");
  });
});

describe("replay attachments", () => {
  it("emits a resource link and metadata for a real stored image without inlining bytes", async () => {
    const home = newHome();
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const hex = storeImage(home, image);
    const attachment = {
      attachmentId: `sha256:${hex}`,
      mediaType: "image/png",
      bytes: image.length,
      width: 12,
      height: 8,
      name: "shot.png",
    };
    const notices: ReplayNotice[] = [];
    writeSession(home, "s-img", [
      {
        type: "user/message",
        seq: 1,
        data: {
          role: "user",
          id: "u-img",
          content: [
            { type: "text", text: "look" },
            { type: "image", attachment },
          ],
        },
      },
    ]);
    const frames = await collect("s-img", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(notices).toEqual([]);
    const [text, imageUpdate] = updates(frames);
    expect(text?.content).toEqual({ type: "text", text: "look" });
    expect(imageUpdate).toMatchObject({
      sessionUpdate: "user_message_chunk",
      messageId: "u-img",
      content: {
        type: "resource_link",
        uri: `dsh-attachment://${hex}`,
        name: "shot.png",
        mimeType: "image/png",
        size: image.length,
      },
      _meta: {
        "deepseek-harness": {
          type: "history-attachment",
          sessionId: "s-img",
          messageId: "u-img",
          attachment: {
            attachmentId: `sha256:${hex}`,
            mediaType: "image/png",
            bytes: image.length,
            width: 12,
            height: 8,
            name: "shot.png",
          },
        },
      },
    });
    expect(JSON.stringify(frames)).not.toContain(image.toString("base64"));
    const metadata = (imageUpdate!._meta as Record)["deepseek-harness"];
    expect(historyAttachmentSchema.safeParse(metadata).success).toBe(true);
  });

  it("preserves a stored file attachment as a resource link", async () => {
    const home = newHome();
    const bytes = Buffer.from("hello file");
    const hex = createHash("sha256").update(bytes).digest("hex");
    const dir = join(home, "attachments", "v1", "files", hex.slice(0, 2), hex);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "note.txt"), bytes);
    writeSession(home, "s-file", [
      {
        type: "user/message",
        seq: 1,
        data: {
          role: "user",
          id: "u-file",
          content: [
            {
              type: "file",
              attachment: {
                attachmentId: `sha256:${hex}`,
                name: "note.txt",
                bytes: bytes.length,
              },
            },
          ],
        },
      },
    ]);
    const [update] = updates(await collect("s-file", { DSH_HOME: home }));
    expect(update?.content).toMatchObject({
      type: "resource_link",
      name: "note.txt",
      size: bytes.length,
    });
    expect(String((update!.content as Record).uri).startsWith("file://")).toBe(
      true,
    );
    expect(update?._meta).toMatchObject({
      "deepseek-harness": {
        type: "history-file",
        attachment: { attachmentId: `sha256:${hex}` },
      },
    });
  });

  it("preserves tool-result image attachments and metadata", async () => {
    const home = newHome();
    const image = Buffer.from([1, 2, 3, 4]);
    const hex = storeImage(home, image);
    writeSession(home, "s-tool-img", [
      {
        type: "tool/call",
        seq: 1,
        data: { turn: 1, step: 1, callId: "c-img", name: "screenshot", arguments: "{}" },
      },
      {
        type: "tool/result",
        seq: 2,
        data: {
          turn: 1,
          step: 1,
          message: {
            role: "tool",
            source: { kind: "tool", callId: "c-img" },
            toolCallId: "c-img",
            content: [
              {
                type: "image",
                attachment: {
                  attachmentId: `sha256:${hex}`,
                  mediaType: "image/png",
                  bytes: image.length,
                },
              },
            ],
            isError: false,
            id: "r-img",
          },
        },
      },
    ]);
    const frames = await collect("s-tool-img", { DSH_HOME: home });
    const update = updates(frames)[1];
    expect(update?.sessionUpdate).toBe("tool_call_update");
    expect(update?.status).toBe("completed");
    expect((update!.content as Record[])[0]).toMatchObject({
      type: "content",
      content: {
        type: "resource_link",
        uri: `dsh-attachment://${hex}`,
        mimeType: "image/png",
      },
      _meta: {
        "deepseek-harness": {
          toolCallId: "c-img",
          attachment: {
            attachmentId: `sha256:${hex}`,
          },
        },
      },
    });
  });

  it("warns visibly and summarizes repeated missing attachments", async () => {
    const home = newHome();
    const missing = "f".repeat(64);
    const records: Record[] = Array.from({ length: 10 }, (_, index) => ({
      type: "user/message",
      seq: index + 1,
      data: {
        role: "user",
        id: `u${index}`,
        content: [
          {
            type: "image",
            attachment: {
              attachmentId: `sha256:${missing}`,
              mediaType: "image/png",
              bytes: 4,
            },
          },
        ],
      },
    }));
    writeSession(home, "s-missing-img", records);
    const notices: ReplayNotice[] = [];
    const frames = await collect("s-missing-img", { DSH_HOME: home }, (notice) =>
      notices.push(notice),
    );
    expect(frames).toEqual([]);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.message).toContain("stored image");
    expect(notices[0]?.message).toContain("2 more replay issues suppressed");
  });

  it("reads images on demand with byte and digest verification", async () => {
    const home = newHome();
    const image = Buffer.from([9, 8, 7, 6, 5]);
    const hex = storeImage(home, image);
    const read = await readDshImageAttachment(
      { attachmentId: `sha256:${hex}`, mediaType: "image/png", bytes: image.length },
      { DSH_HOME: home },
    );
    expect(read.mimeType).toBe("image/png");
    expect(read.bytes.equals(image)).toBe(true);

    await expect(
      readDshImageAttachment(
        { attachmentId: `sha256:${hex}`, mediaType: "image/png", bytes: 1 },
        { DSH_HOME: home },
      ),
    ).rejects.toThrow("expected 1");

    const corruptHex = createHash("sha256").update(Buffer.from("other")).digest("hex");
    const corruptDir = join(
      home,
      "attachments",
      "v1",
      "objects",
      corruptHex.slice(0, 2),
    );
    mkdirSync(corruptDir, { recursive: true });
    writeFileSync(join(corruptDir, corruptHex), Buffer.from("corrupt"));
    await expect(
      readDshImageAttachment(
        { attachmentId: `sha256:${corruptHex}`, mediaType: "image/png" },
        { DSH_HOME: home },
      ),
    ).rejects.toThrow("integrity check");
  });
});

describe("streaming and lifecycle", () => {
  it("yields one update at a time so callers can apply backpressure", async () => {
    const home = newHome();
    const records: Record[] = Array.from({ length: 300 }, (_, index) => ({
      type: "user/message",
      seq: index + 1,
      data: {
        role: "user",
        id: `u${index}`,
        content: [{ type: "text", text: `message-${index}` }],
      },
    }));
    writeSession(home, "s-large", records);
    const iterator = replayDshSession("s-large", {
      cwd: "/cwd",
      env: { DSH_HOME: home },
    });
    const first = await iterator.next();
    expect(first.done).toBe(false);
    expect(updates([first.value!])[0]).toMatchObject({ content: { text: "message-0" } });
    const second = await iterator.next();
    expect(updates([second.value!])[0]).toMatchObject({ content: { text: "message-1" } });
    await iterator.return(undefined);
    expect((await iterator.next()).done).toBe(true);
  });

  it("finds a session file by id across cwd-key directories", async () => {
    const home = newHome();
    const file = writeSession(home, "sess-7", []);
    await expect(locateDshSessionFile(home, "sess-7")).resolves.toBe(file);
    await expect(locateDshSessionFile(home, "missing")).resolves.toBeUndefined();
    await expect(
      locateDshSessionFile("/no/such/home", "sess-7"),
    ).resolves.toBeUndefined();
  });

  it("resolves DSH_HOME from the session env first", () => {
    expect(resolveDshHome({ DSH_HOME: "/custom" })).toBe("/custom");
    expect(resolveDshHome({})).toMatch(/\.dsh$|^.+$/);
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

async function initialize(
  transport: MemoryTransport,
  managed: ManagedAcpStream,
): Promise<void> {
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
  reader.releaseLock();
  writer.releaseLock();
}

async function openReplay(
  transport: MemoryTransport,
  managed: ManagedAcpStream,
  sessionId: string,
): Promise<ReadableStreamDefaultReader<AcpStreamMessage>> {
  const writer = managed.writable.getWriter();
  await writer.write(
    frame({
      jsonrpc: "2.0",
      id: 2,
      method: "session/load",
      params: { sessionId, cwd: "/cwd", mcpServers: [] },
    }),
  );
  writer.releaseLock();
  return managed.readable.getReader();
}

describe("createAcpCompatibilityStream resume replay", () => {
  it("injects the transcript before the successful resume response", async () => {
    const home = newHome();
    writeSession(home, "native-1", SAMPLE_RECORDS);
    const transport = memoryTransport();
    const notices: ReplayNotice[] = [];
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      {
        cwd: "/cwd",
        env: { DSH_HOME: home },
        onReplayNotice: (notice) => notices.push(notice),
      },
    );
    await initialize(transport, managed);
    const reader = await openReplay(transport, managed, "native-1");
    transport.input.enqueue(frame({ jsonrpc: "2.0", id: 2, result: {} }));

    const seen: AcpStreamMessage[] = [];
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      seen.push(next.value);
      const record = next.value as unknown as Record;
      if (record.id === 2 && "result" in record) {
        break;
      }
    }
    expect(updateKinds(seen)).toEqual([
      "user_message_chunk",
      "agent_thought_chunk",
      "agent_message_chunk",
      "tool_call",
      "tool_call_update",
    ]);
    const last = seen[seen.length - 1] as unknown as Record;
    expect(last.id).toBe(2);
    expect("result" in last).toBe(true);
    expect(notices).toEqual([]);

    await managed.close();
  });

  it("delivers the resume response and a notice when the store is missing", async () => {
    const home = newHome();
    const transport = memoryTransport();
    const notices: ReplayNotice[] = [];
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      {
        cwd: "/cwd",
        env: { DSH_HOME: home },
        onReplayNotice: (notice) => notices.push(notice),
      },
    );
    await initialize(transport, managed);
    const reader = await openReplay(transport, managed, "ghost");
    transport.input.enqueue(frame({ jsonrpc: "2.0", id: 2, result: {} }));

    const next = await reader.read();
    const record = next.value as unknown as Record;
    expect(record.id).toBe(2);
    expect("result" in record).toBe(true);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.sessionId).toBe("ghost");

    await managed.close();
  });

  it("delivers a valid prefix, a warning, and the resume response for a corrupt store", async () => {
    const home = newHome();
    writeSession(
      home,
      "native-corrupt",
      Buffer.concat([
        encodeStore([
          {
            type: "user/message",
            seq: 1,
            data: {
              role: "user",
              id: "u1",
              content: [{ type: "text", text: "kept" }],
            },
          },
        ]),
        Buffer.from("not-a-frame"),
      ]),
    );
    const transport = memoryTransport();
    const notices: ReplayNotice[] = [];
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      {
        cwd: "/cwd",
        env: { DSH_HOME: home },
        onReplayNotice: (notice) => notices.push(notice),
      },
    );
    await initialize(transport, managed);
    const reader = await openReplay(transport, managed, "native-corrupt");
    transport.input.enqueue(frame({ jsonrpc: "2.0", id: 2, result: {} }));

    const seen: AcpStreamMessage[] = [];
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      seen.push(next.value);
      const record = next.value as unknown as Record;
      if (record.id === 2 && "result" in record) {
        break;
      }
    }
    expect(updateKinds(seen)).toEqual(["user_message_chunk"]);
    const last = seen[seen.length - 1] as unknown as Record;
    expect(last.id).toBe(2);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.message).toContain("history replay stopped at byte");

    await managed.close();
  });

  it("injects no history when the resume response is an error", async () => {
    const home = newHome();
    writeSession(home, "native-err", SAMPLE_RECORDS);
    const transport = memoryTransport();
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      { cwd: "/cwd", env: { DSH_HOME: home } },
    );
    await initialize(transport, managed);
    const reader = await openReplay(transport, managed, "native-err");
    transport.input.enqueue(
      frame({
        jsonrpc: "2.0",
        id: 2,
        error: { code: -32000, message: "resume refused" },
      }),
    );

    const next = await reader.read();
    if (next.done) throw new Error("Resume response was lost");
    const record = next.value as unknown as Record;
    expect(record.id).toBe(2);
    expect(record.error).toBeDefined();
    expect(updateKinds([next.value])).toEqual([]);

    await managed.close();
  });

  it("releases the stream when closed while replay is pending", async () => {
    const home = newHome();
    const records: Record[] = Array.from({ length: 500 }, (_, index) => ({
      type: "user/message",
      seq: index + 1,
      data: {
        role: "user",
        id: `u${index}`,
        content: [{ type: "text", text: `message-${index}` }],
      },
    }));
    writeSession(home, "native-close", records);
    const transport = memoryTransport();
    const managed = createAcpCompatibilityStream(
      transport.source,
      transport.owner,
      () => undefined,
      { cwd: "/cwd", env: { DSH_HOME: home } },
    );
    await initialize(transport, managed);
    const reader = await openReplay(transport, managed, "native-close");
    transport.input.enqueue(frame({ jsonrpc: "2.0", id: 2, result: {} }));

    const first = await reader.read();
    expect(first.done).toBe(false);
    expect(updateKinds([first.value!])).toEqual(["user_message_chunk"]);
    await managed.close();
    expect(transport.owner.close).toHaveBeenCalledTimes(1);
    reader.releaseLock();
  });
});
