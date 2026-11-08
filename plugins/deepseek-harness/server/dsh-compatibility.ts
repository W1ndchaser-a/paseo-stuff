import type { ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Readable, Writable } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { setImmediate as setImmediatePromise } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { zstdDecompress } from "node:zlib";
import { ndJsonStream, type AnyMessage } from "@agentclientprotocol/sdk";
import { spawnProcess, terminateProcess } from "@getpaseo/plugin/server";
import type {
  AcpStream,
  AcpStreamMessage,
} from "@getpaseo/plugin/server/acp";
import type {
  ProviderLaunch,
  ProviderStatus,
} from "@getpaseo/plugin/server/provider";

// Minimum only, like the Paseo requirements range: newer DSH releases are
// accepted, and ACP behaviour is chosen from the capabilities DSH advertises.
// Add an exclusion only for a release known to be incompatible.
export const MINIMUM_DSH_VERSION = "0.1.5-rc.1";

const VERSION_PROBE_TIMEOUT_MS = 5_000;
const STARTUP_TIMEOUT_MS = 5_000;
const SHUTDOWN_SIGNAL_TIMEOUT_MS = 1_000;
const DIAGNOSTIC_LIMIT = 1_600;
const STDERR_CAPTURE_LIMIT = 8_192;
const ANSI_ESCAPE_RE = new RegExp(
  String.fromCharCode(27) + "\\[[0-?]*[ -/]*[@-~]",
  "g",
);

export interface ConnectorResource {
  close(reason?: unknown): Promise<void>;
}

export interface DshConnectorContext {
  /** Executable, argument prefix and complete environment resolved by the daemon. */
  launch: ProviderLaunch;
  cwd: string;
  /** Session variables, applied over the launch environment. */
  env: Readonly<Record<string, string>>;
  resources: Set<ConnectorResource>;
  isClosed?: () => boolean;
  /**
   * Surface a degraded history replay (missing store, corrupt records, missing
   * attachments) as a user-visible notice. `sessionId` is DSH's native id; the
   * provider remaps it to the Paseo session before emitting `session.notice`.
   */
  onReplayNotice?: (notice: ReplayNotice) => void;
}

/** One user-visible history-replay warning, scoped to DSH's native session id. */
export interface ReplayNotice {
  sessionId: string;
  message: string;
}

export interface AcpStreamOwner {
  close(reason?: unknown): Promise<void>;
  onFailure(listener: (error: Error) => void): () => void;
}

export interface ManagedAcpStream extends AcpStream {
  close(reason?: unknown): Promise<void>;
  fail(error: unknown): void;
}

/**
 * Where to find the DSH session store for synthesizing resume replay. DSH
 * resumes a session's context without replaying its transcript, so on a Paseo
 * resume (history: "replay") the timeline would otherwise come back empty. We
 * read the frozen session.v4 store directly and inject the history as ACP
 * session/update notifications before the resume response.
 */
export interface ReplayContext {
  cwd: string;
  env: Readonly<Record<string, string>>;
  /** Receives at most one summarized warning when replay is degraded. */
  onReplayNotice?: (notice: ReplayNotice) => void;
}

type ProtocolState =
  | "awaiting-initialize"
  | "awaiting-initialize-response"
  | "initialized"
  | "closed";

type PersistenceMode = "none" | "resume" | "native-load";

interface RecordValue {
  [key: string]: unknown;
}

export function assertSupportedNodeVersion(version = process.versions.node): void {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    throw new Error(
      "DeepSeek Harness requires Node.js 22.19.0 or newer; the daemon runtime reported " +
        version,
    );
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    major < 22 ||
    (major === 22 && (minor < 19 || (minor === 19 && patch < 0)))
  ) {
    throw new Error(
      "DeepSeek Harness requires Node.js 22.19.0 or newer; the daemon runtime reported " +
        version,
    );
  }
}

export function extractDshVersion(output: string): string | undefined {
  // Keep prerelease and build metadata so diagnostics show the exact version.
  return /(?:^|[^0-9A-Za-z.+_-])([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)(?=$|[^0-9A-Za-z.+_-])/.exec(
    output,
  )?.[1];
}

export function isSupportedDshVersion(version: string | undefined): boolean {
  if (version === undefined) return false;
  const parsed = parseSemver(version);
  const minimum = parseSemver(MINIMUM_DSH_VERSION);
  return parsed !== undefined && minimum !== undefined && compareSemver(parsed, minimum) >= 0;
}

interface Semver {
  core: [number, number, number];
  prerelease: string[];
}

function parseSemver(version: string): Semver | undefined {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
}

/** Semantic Versioning 2.0 precedence; build metadata is ignored. */
function compareSemver(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] - b.core[i];
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return b.prerelease.length - a.prerelease.length;
  }
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) - Number(y);
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export function redactDiagnostic(value: string): string {
  return value
    .replace(ANSI_ESCAPE_RE, "")
    .replace(
      // Accept JSON/log key quotes and the common "API key" spelling.
      // Consume escaped quotes too, rather than leaking the rest of a value.
      /(["']?(?:api[ _-]?key|authorization|bearer|token|secret|password|cookie)["']?\s*[:=]\s*)(?:Bearer\s+)?(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[^\s,;]+)/gi,
      "$1[redacted]",
    )
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]")
    .trim()
    .slice(0, DIAGNOSTIC_LIMIT);
}

export async function createDshAcpStream(
  context: DshConnectorContext,
): Promise<ManagedAcpStream> {
  assertSupportedNodeVersion();
  assertConnectorOpen(context, "before starting");

  const env = { ...context.launch.env, ...context.env };
  const cwd = context.cwd || process.cwd();
  const { command, args } = context.launch;

  await probeDshVersion(context.launch, cwd, env, context);
  assertConnectorOpen(context, "after version probe");

  const child = spawnProcess(command, [...args], {
    cwd,
    env,
    stdio: "pipe",
  });
  const stderr = new BoundedCapture(STDERR_CAPTURE_LIMIT);
  const owner = new ChildProcessOwner(child, command, () => stderr.value);
  if (!child.stdin || !child.stdout || !child.stderr) {
    const startupError = new Error(
      "DeepSeek Harness ACP could not acquire piped stdio for executable " +
        command,
    );
    await owner.close(startupError).catch(() => undefined);
    throw startupError;
  }

  child.stderr.on("data", (chunk: unknown) => stderr.append(chunk));

  const raw = ndJsonStream(
    Writable.toWeb(child.stdin),
    Readable.toWeb(child.stdout),
  ) as unknown as AcpStream;
  let resource: ConnectorResource | undefined;
  const managed = createAcpCompatibilityStream(
    raw,
    owner,
    () => {
      if (resource) {
        context.resources.delete(resource);
      }
    },
    { cwd, env, onReplayNotice: context.onReplayNotice },
  );
  resource = {
    close: (reason) => managed.close(reason),
  };

  try {
    await registerConnectorResource(context, resource, "ACP startup");
    await waitForChildSpawn(child);
    if (owner.hasExited) {
      throw new Error(
        "DeepSeek Harness ACP exited during startup." +
          diagnosticSuffix(stderr.value),
      );
    }
    return managed;
  } catch (error) {
    const startupError = new Error(
      "DeepSeek Harness ACP failed to start " +
        command +
        "." +
        diagnosticSuffix(stderr.value),
      );
    await managed.close(startupError).catch(() => undefined);
    throw new Error(startupError.message, { cause: error });
  }
}

export function createAcpCompatibilityStream(
  source: AcpStream,
  owner: AcpStreamOwner,
  onClosed: () => void = () => undefined,
  replayContext?: ReplayContext,
): ManagedAcpStream {
  const reader = source.readable.getReader();
  const writer = source.writable.getWriter();

  let state: ProtocolState = "awaiting-initialize";
  let persistenceMode: PersistenceMode = "none";
  let initializeId: string | number | null | undefined;
  // A session/load translated to session/resume whose transcript we will inject
  // inbound, right before DSH's resume response, so Paseo's replay window sees it.
  // The transcript is an async generator, not a materialized array: the readable
  // stream pulls one update at a time and the decoder applies backpressure.
  let pendingResume:
    | {
        id: string | number | null;
        sessionId: string;
        frames: AsyncGenerator<AcpStreamMessage>;
      }
    | undefined;
  let pendingReplay:
    | {
        sessionId: string;
        iterator: AsyncGenerator<AcpStreamMessage>;
        response: AcpStreamMessage;
      }
    | undefined;
  const replayAbort = new AbortController();
  let readableController:
    | ReadableStreamDefaultController<AcpStreamMessage>
    | undefined;
  let failed = false;
  let closePromise: Promise<void> | undefined;

  const unsubscribeFailure = owner.onFailure((error) => {
    fail(error);
  });

  const disposeReplay = (): void => {
    const resume = pendingResume;
    pendingResume = undefined;
    if (resume) {
      void resume.frames.return(undefined).catch(() => undefined);
    }
    const replay = pendingReplay;
    pendingReplay = undefined;
    if (replay) {
      void replay.iterator.return(undefined).catch(() => undefined);
    }
  };

  const close = (reason?: unknown): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    state = "closed";
    replayAbort.abort(reason);
    disposeReplay();
    closePromise = (async () => {
      const results = await Promise.allSettled([
        reader.cancel(reason),
        writer.abort(reason),
        owner.close(reason),
      ]);
      unsubscribeFailure();
      onClosed();

      const ownerResult = results[2];
      if (ownerResult.status === "rejected") {
        throw asError(ownerResult.reason);
      }
    })();
    return closePromise;
  };

  function fail(error: unknown): void {
    if (state === "closed") {
      return;
    }
    failed = true;
    state = "closed";
    const normalized = asError(error);
    try {
      readableController?.error(normalized);
    } catch {
      // The stream may already have been terminated by its consumer.
    }
    void close(normalized).catch(() => undefined);
  }

  const readable = new ReadableStream<AcpStreamMessage>({
    start(controller) {
      readableController = controller;
    },
    async pull(controller) {
      try {
        if (pendingReplay) {
          await pumpReplay(controller);
          return;
        }

        const next = await reader.read();
        if (next.done) {
          await close(new Error("DeepSeek Harness ACP stdio reached EOF"));
          if (!failed) {
            controller.close();
          }
          return;
        }

        const message = assertAcpStreamMessage(next.value as AnyMessage);
        if (
          pendingResume &&
          isResponseFrame(message) &&
          message.id === pendingResume.id
        ) {
          const resume = pendingResume;
          pendingResume = undefined;
          // A failed resume never injects history: Paseo must see the error, not
          // a transcript for a session DSH refused to restore.
          if (hasOwn(message, "error")) {
            void resume.frames.return(undefined).catch(() => undefined);
            controller.enqueue(transformInbound(message));
            return;
          }
          pendingReplay = {
            sessionId: resume.sessionId,
            iterator: resume.frames,
            response: message,
          };
          await pumpReplay(controller);
          return;
        }
        controller.enqueue(transformInbound(message));
      } catch (error) {
        fail(error);
      }
    },
    cancel(reason) {
      return close(reason);
    },
  });

  const writable = new WritableStream<AcpStreamMessage>({
    async write(input) {
      try {
        const message = assertAcpStreamMessage(input);
        await writer.write(transformOutbound(message));
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    close() {
      return close(new Error("DeepSeek Harness ACP stdio writable closed"));
    },
    abort(reason) {
      return close(reason);
    },
  });

  async function pumpReplay(
    controller: ReadableStreamDefaultController<AcpStreamMessage>,
  ): Promise<void> {
    const replay = pendingReplay;
    if (!replay) {
      return;
    }
    try {
      const next = await replay.iterator.next();
      if (state === "closed") {
        return;
      }
      if (next.done) {
        pendingReplay = undefined;
        controller.enqueue(transformInbound(replay.response));
        return;
      }
      controller.enqueue(next.value);
      const frame = next.value;
      if (isNotificationFrame(frame) && isRecord(frame.params)) {
        const update = replayRecord(frame.params.update);
        const metadata = replayRecord(update._meta)["deepseek-harness"];
        if (isRecord(metadata) && (metadata.type === "history-attachment" || metadata.type === "history-file")) {
          // Paseo transformers see extension notifications, not standard ACP
          // session/update frames. Keep the standard tool state update too.
          controller.enqueue({ jsonrpc: "2.0", method: "_dsh/history-attachment", params: frame.params });
        }
      }
    } catch (error) {
      pendingReplay = undefined;
      if (state === "closed") {
        return;
      }
      // The replay generator reports recoverable issues as notices itself; this
      // path only exposes an unexpected failure, and never blocks the resume.
      reportReplayError(replay.sessionId, error);
      controller.enqueue(transformInbound(replay.response));
    }
  }

  function reportReplayError(sessionId: string, error: unknown): void {
    try {
      replayContext?.onReplayNotice?.({
        sessionId,
        message: `History replay failed before completion: ${asError(error).message}`,
      });
    } catch {
      // A broken notice sink must not turn a successful resume into a failure.
    }
  }

  return {
    readable,
    writable,
    close,
    fail,
  };

  function transformOutbound(message: AcpStreamMessage): AcpStreamMessage {
    if (state === "closed") {
      throw new Error("DeepSeek Harness ACP stream is closed");
    }

    if (state === "awaiting-initialize") {
      if (!isRequestFrame(message) || message.method !== "initialize") {
        throw new Error(
          "DeepSeek Harness ACP received a non-initialize frame before initialization",
        );
      }
      initializeId = message.id;
      state = "awaiting-initialize-response";
      return message;
    }

    if (state === "awaiting-initialize-response") {
      throw new Error(
        "DeepSeek Harness ACP received an outbound frame before initialize completed",
      );
    }

    const messageRecord = message as unknown as RecordValue;
    if (messageRecord.method === "initialize") {
      throw new Error(
        "DeepSeek Harness ACP received a duplicate initialize request",
      );
    }

    if (messageRecord.method !== "session/load") {
      return message;
    }

    if (persistenceMode === "native-load") {
      return message;
    }
    if (persistenceMode !== "resume") {
      throw new Error(
        "DeepSeek Harness ACP cannot translate session/load because the peer did not advertise session/resume",
      );
    }
    if (
      !isRequestFrame(message) ||
      !isLoadSessionParams(messageRecord.params)
    ) {
      throw new Error(
        "DeepSeek Harness ACP received an invalid session/load request",
      );
    }

    if (replayContext) {
      const sessionId = (messageRecord.params as RecordValue).sessionId;
      if (typeof sessionId === "string" && sessionId.length > 0) {
        const previous = pendingResume;
        pendingResume = undefined;
        if (previous) {
          void previous.frames.return(undefined).catch(() => undefined);
        }
        pendingResume = {
          id: message.id,
          sessionId,
          frames: replayDshSession(
            sessionId,
            replayContext,
            replayAbort.signal,
          ),
        };
      }
    }

    return {
      ...message,
      method: "session/resume",
    } as AcpStreamMessage;
  }

  function transformInbound(message: AcpStreamMessage): AcpStreamMessage {
    if (state === "awaiting-initialize-response") {
      if (!isResponseFrame(message) || message.id !== initializeId) {
        throw new Error(
          "DeepSeek Harness ACP received an unexpected frame while waiting for initialize",
        );
      }

      state = "initialized";
      if (hasOwn(message, "error")) {
        return message;
      }
      return projectInitializeCapabilities(message);
    }

    if (state === "awaiting-initialize") {
      throw new Error(
        "DeepSeek Harness ACP received a frame before the initialize request",
      );
    }
    if (state === "closed") {
      throw new Error("DeepSeek Harness ACP stream is closed");
    }

    return projectToolOutput(projectThoughtMessageId(message));
  }

  function projectInitializeCapabilities(
    message: AcpStreamMessage,
  ): AcpStreamMessage {
    const messageRecord = message as unknown as RecordValue;
    if (!isRecord(messageRecord.result)) {
      throw new Error(
        "DeepSeek Harness ACP initialize succeeded without an object result",
      );
    }

    const result = messageRecord.result;
    const capabilitiesValue = result.agentCapabilities;
    if (capabilitiesValue === undefined) {
      persistenceMode = "none";
      return message;
    }
    if (!isRecord(capabilitiesValue)) {
      throw new Error(
        "DeepSeek Harness ACP initialize returned invalid agentCapabilities",
      );
    }

    const hasLoad = validateLoadCapability(capabilitiesValue);
    const sessionCapabilitiesValue = capabilitiesValue.sessionCapabilities;
    if (
      sessionCapabilitiesValue !== undefined &&
      sessionCapabilitiesValue !== null &&
      !isRecord(sessionCapabilitiesValue)
    ) {
      throw new Error(
        "DeepSeek Harness ACP initialize returned invalid sessionCapabilities",
      );
    }

    const resumeValue =
      isRecord(sessionCapabilitiesValue) &&
      hasOwn(sessionCapabilitiesValue, "resume")
        ? sessionCapabilitiesValue.resume
        : undefined;
    if (
      resumeValue !== undefined &&
      resumeValue !== null &&
      !isRecord(resumeValue)
    ) {
      throw new Error(
        "DeepSeek Harness ACP initialize returned invalid session/resume capability",
      );
    }

    if (hasLoad) {
      persistenceMode = "native-load";
      return message;
    }
    if (isRecord(resumeValue)) {
      persistenceMode = "resume";
      return {
        ...message,
        result: {
          ...result,
          agentCapabilities: {
            ...capabilitiesValue,
            loadSession: true,
          },
        },
      } as AcpStreamMessage;
    }

    persistenceMode = "none";
    return message;
  }
}

function projectThoughtMessageId(message: AcpStreamMessage): AcpStreamMessage {
  const params = (message as unknown as RecordValue).params;
  if (
    !isNotificationFrame(message) ||
    message.method !== "session/update" ||
    !isRecord(params) ||
    !isRecord(params.update)
  ) {
    return message;
  }
  const update = params.update;
  if (
    update.sessionUpdate !== "agent_thought_chunk" ||
    typeof update.messageId !== "string" ||
    update.messageId.length === 0
  ) {
    return message;
  }

  // dsh-acp sends a message's thought and answer chunks with one messageId;
  // ACP treats that as one message, so Paseo merges the two buffers. Remove
  // once DSH sends distinct IDs:
  // https://github.com/deepseek-ai/deepseek-harness/discussions/8235
  // ACP IDs are strings, not UUID-only. Keep the answer's native ID untouched.
  return {
    ...message,
    params: {
      ...params,
      update: { ...update, messageId: update.messageId + ":thought" },
    },
  } as AcpStreamMessage;
}

function projectToolOutput(message: AcpStreamMessage): AcpStreamMessage {
  const messageRecord = message as unknown as RecordValue;
  const paramsValue = messageRecord.params;
  if (
    !isNotificationFrame(message) ||
    messageRecord.method !== "session/update" ||
    !isRecord(paramsValue) ||
    !isRecord(paramsValue.update)
  ) {
    return message;
  }

  const params = paramsValue;
  const updateValue = params.update;
  if (!isRecord(updateValue)) {
    return message;
  }
  const update = updateValue;
  if (
    update.sessionUpdate !== "tool_call" &&
    update.sessionUpdate !== "tool_call_update"
  ) {
    return message;
  }
  if (!Array.isArray(update.content)) {
    return message;
  }
  if (hasOwn(update, "rawOutput") && update.rawOutput !== undefined) {
    return message;
  }

  return {
    ...message,
    params: {
      ...params,
      update: {
        ...update,
        rawOutput: {
          content: update.content,
        },
      },
    },
  } as AcpStreamMessage;
}

// --- DSH session resume replay -------------------------------------------
//
// DSH's ACP advertises session/resume but not transcript replay: resuming
// restores the model's context without re-emitting the conversation. Paseo opens
// a resumed agent with history "replay" and expects session/update chunks, so
// without this the timeline comes back empty while the model still has context.
// We read DSH's own session.v4 store (frozen alongside the pinned DSH build) and
// reconstruct the transcript as ACP session/update notifications. Any failure
// degrades to the previous behaviour (empty timeline) rather than breaking resume.

const ZSTD_MAGIC = 0xfd2fb528;
const ZSTD_SKIPPABLE_MAGIC = 0x184d2a50;
const ZSTD_SKIPPABLE_MASK = 0xfffffff0;
const ZSTD_READ_CHUNK_BYTES = 256 * 1024;
const MAX_REPLAY_NOTICE_DETAILS = 8;

/** Collects replay problems so a degraded resume produces one summarized notice
 * instead of one event per malformed record or missing attachment. */
class ReplayNoticeBuffer {
  private readonly details: string[] = [];
  private suppressed = 0;
  private flushed = false;

  public constructor(
    private readonly sessionId: string,
    private readonly sink: ((notice: ReplayNotice) => void) | undefined,
  ) {}

  public add(message: string): void {
    if (this.details.length < MAX_REPLAY_NOTICE_DETAILS) {
      this.details.push(message);
    } else {
      this.suppressed += 1;
    }
  }

  public flush(): void {
    if (this.flushed || this.details.length === 0 || !this.sink) {
      return;
    }
    this.flushed = true;
    const suppressed =
      this.suppressed === 0
        ? ""
        : `; ${this.suppressed} more replay issue${
            this.suppressed === 1 ? "" : "s"
          } suppressed`;
    try {
      this.sink({
        sessionId: this.sessionId,
        message: this.details.join("; ") + suppressed,
      });
    } catch {
      // A broken notice sink must not turn a successful resume into a failure.
    }
  }
}

export function resolveDshHome(env: Readonly<Record<string, string>>): string {
  return env.DSH_HOME || process.env.DSH_HOME || join(homedir(), ".dsh");
}

/** Sessions live under <home>/sessions/<cwd-key>/<sessionId>/; the id is unique,
 * so we scan the cwd-key dirs rather than reproducing DSH's path encoding. */
export async function locateDshSessionFile(
  home: string,
  sessionId: string,
): Promise<string | undefined> {
  if (!isSafeSessionId(sessionId)) {
    throw new Error(`invalid DSH session id "${sessionId}"`);
  }
  const sessionsDir = join(home, "sessions");
  let entries: string[];
  try {
    entries = await readdir(sessionsDir);
  } catch (error) {
    if (isMissingPathError(asError(error))) {
      return undefined;
    }
    throw error;
  }
  for (const key of entries) {
    const file = join(sessionsDir, key, sessionId, "session.v4.jsonl.zstd");
    try {
      const metadata = await stat(file);
      if (metadata.isFile()) {
        return file;
      }
    } catch (error) {
      if (!isMissingPathError(asError(error))) {
        throw error;
      }
    }
  }
  return undefined;
}

function isSafeSessionId(sessionId: string): boolean {
  return (
    sessionId.length > 0 &&
    sessionId !== "." &&
    sessionId !== ".." &&
    !sessionId.includes("/") &&
    !sessionId.includes("\\") &&
    basename(sessionId) === sessionId
  );
}

const zstdDecompressAsync = promisify(zstdDecompress);

/**
 * DSH appends every record as its own zstd frame, so the store is a stream of
 * concatenated frames. Node's one-shot decoder consumes a single frame, so we
 * scan frame boundaries incrementally and decode one frame at a time without
 * ever materializing the compressed or decompressed file in full.
 */
async function* decodeDshSessionRecords(
  file: string,
  signal: AbortSignal | undefined,
  notices: ReplayNoticeBuffer,
): AsyncGenerator<RecordValue> {
  const stream = createReadStream(file, {
    highWaterMark: ZSTD_READ_CHUNK_BYTES,
    ...(signal ? { signal } : {}),
  });
  let pending = Buffer.alloc(0);
  let offset = 0;
  let logicalRecord = 0;
  let lastSeq: number | undefined;
  let stopped = false;
  const decoder = new StringDecoder("utf8");
  let text = "";

  function* parseLines(
    chunk: Buffer | undefined,
    final = false,
  ): Generator<RecordValue> {
    if (chunk) {
      text += decoder.write(chunk);
    }
    if (final) {
      text += decoder.end();
    }
    for (;;) {
      const newline = text.indexOf("\n");
      if (newline < 0) {
        break;
      }
      const line = text.slice(0, newline);
      text = text.slice(newline + 1);
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      logicalRecord += 1;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        notices.add(
          `record ${logicalRecord} is not valid JSON: ${asError(error).message}`,
        );
        continue;
      }
      if (!isRecord(parsed)) {
        notices.add(`record ${logicalRecord} is not a JSON object`);
        continue;
      }
      const seq =
        typeof parsed.seq === "number" && Number.isFinite(parsed.seq)
          ? parsed.seq
          : undefined;
      if (seq !== undefined) {
        if (lastSeq !== undefined && seq < lastSeq) {
          notices.add(
            `record ${logicalRecord} has seq ${seq} after ${lastSeq}; replay follows stored order`,
          );
        }
        lastSeq = seq;
      }
      yield parsed;
    }
    if (final && text.length > 0) {
      const trimmed = text.trim();
      text = "";
      if (trimmed) {
        logicalRecord += 1;
        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch (error) {
          notices.add(
            `record ${logicalRecord} is not valid JSON: ${asError(error).message}`,
          );
          return;
        }
        if (!isRecord(parsed)) {
          notices.add(`record ${logicalRecord} is not a JSON object`);
          return;
        }
        yield parsed;
      }
    }
  }

  try {
    for await (const chunk of stream) {
      signal?.throwIfAborted();
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      pending = pending.length === 0 ? bytes : Buffer.concat([pending, bytes]);
      let consumed = 0;
      while (pending.length - consumed >= 4) {
        const magic = pending.readUInt32LE(consumed);
        if ((magic & ZSTD_SKIPPABLE_MASK) === ZSTD_SKIPPABLE_MAGIC) {
          const end = skippableFrameEnd(pending, consumed);
          if (end === undefined) {
            break;
          }
          consumed = end;
          continue;
        }
        let end: number | undefined;
        try {
          end = scanZstdFrameEnd(pending, consumed);
        } catch (error) {
          notices.add(
            `history replay stopped at byte ${offset + consumed}: ${asError(error).message}`,
          );
          stopped = true;
          break;
        }
        if (end === undefined) {
          break;
        }
        const frameStart = consumed;
        consumed = end;
        let decoded: Buffer;
        try {
          decoded = await zstdDecompressAsync(
            pending.subarray(frameStart, end),
          );
        } catch (error) {
          notices.add(
            `zstd frame at byte ${offset + frameStart} could not be decoded: ${asError(error).message}; that record is unavailable`,
          );
          continue;
        }
        signal?.throwIfAborted();
        yield* parseLines(decoded);
      }
      if (stopped) {
        break;
      }
      if (consumed > 0) {
        offset += consumed;
        pending = pending.subarray(consumed);
      }
    }
    if (!stopped && pending.length > 0) {
      notices.add(
        `transcript ends with an incomplete zstd frame at byte ${offset} (${pending.length} bytes); later history is unavailable`,
      );
    }
    yield* parseLines(undefined, true);
  } finally {
    if (!stream.destroyed) {
      stream.destroy();
    }
  }
}

/** End offset of the zstd frame beginning at `start`, or undefined when the
 * available bytes stop inside its header/blocks. Throws on structurally invalid
 * headers so a corrupt store cannot desynchronize the frame walk silently. */
function scanZstdFrameEnd(bytes: Buffer, start: number): number | undefined {
  if (bytes.length - start < 4) {
    return undefined;
  }
  if (bytes.readUInt32LE(start) !== ZSTD_MAGIC) {
    throw new Error(`invalid zstd frame magic at byte ${start}`);
  }
  let offset = start + 4;
  if (offset >= bytes.length) {
    return undefined;
  }
  const descriptor = bytes.readUInt8(offset);
  offset += 1;
  if ((descriptor & 24) !== 0) {
    throw new Error(`reserved zstd frame-header bit at byte ${offset - 1}`);
  }
  const contentSizeFlag = descriptor >>> 6;
  const singleSegment = (descriptor & 32) !== 0;
  const checksum = (descriptor & 4) !== 0;
  const dictionaryFlag = descriptor & 3;
  const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
  const contentSizeBytes =
    contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag;
  const remainingHeaderBytes =
    (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
  if (bytes.length - offset < remainingHeaderBytes) {
    return undefined;
  }
  offset += remainingHeaderBytes;
  for (;;) {
    if (bytes.length - offset < 3) {
      return undefined;
    }
    const blockHeader = bytes.readUIntLE(offset, 3);
    offset += 3;
    const lastBlock = (blockHeader & 1) !== 0;
    const blockType = (blockHeader >>> 1) & 3;
    const blockSize = blockHeader >>> 3;
    if (blockType === 3) {
      throw new Error(`reserved zstd block type at byte ${offset - 3}`);
    }
    const payloadBytes = blockType === 1 ? 1 : blockSize;
    if (bytes.length - offset < payloadBytes) {
      return undefined;
    }
    offset += payloadBytes;
    if (lastBlock) {
      break;
    }
  }
  if (checksum) {
    if (bytes.length - offset < 4) {
      return undefined;
    }
    offset += 4;
  }
  return offset;
}

function skippableFrameEnd(
  bytes: Buffer,
  start: number,
): number | undefined {
  if (bytes.length - start < 8) {
    return undefined;
  }
  const end = start + 8 + bytes.readUInt32LE(start + 4);
  return end > bytes.length ? undefined : end;
}

/** One attachment reference as stored by DSH in a message content block. */
export interface DshReplayAttachmentRef {
  kind: "image" | "file";
  attachmentId: string;
  mediaType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  name?: string;
}

interface ReplayAttachmentContent {
  content: RecordValue;
  descriptor: DshReplayAttachmentRef;
}

interface ReplayAttachmentIds {
  messageId?: string;
  toolCallId?: string;
}

/** Resolves durable attachment references without reading image bytes during
 * replay: it only validates the reference and confirms the object exists. */
class ReplayAttachments {
  private readonly root: string;

  public constructor(
    home: string,
    private readonly signal: AbortSignal | undefined,
    private readonly notices: ReplayNoticeBuffer,
  ) {
    this.root = join(home, "attachments", "v1");
  }

  public async image(
    value: unknown,
  ): Promise<ReplayAttachmentContent | undefined> {
    const ref = replayRecord(value);
    const attachmentId = replayStr(ref.attachmentId);
    const hex = attachmentHex(attachmentId);
    const mediaType = replayStr(ref.mediaType);
    if (!hex || !attachmentId || !mediaType) {
      this.notices.add(
        `stored image reference ${attachmentId ?? "(missing id)"} is incomplete; image omitted`,
      );
      return undefined;
    }
    const expectedBytes = replayByteSize(ref.bytes);
    const file = join(this.root, "objects", hex.slice(0, 2), hex);
    let metadata;
    try {
      metadata = await stat(file);
    } catch (error) {
      this.notices.add(
        `stored image ${attachmentId} is unavailable: ${asError(error).message}; image omitted`,
      );
      return undefined;
    }
    this.signal?.throwIfAborted();
    if (!metadata.isFile()) {
      this.notices.add(`stored image ${attachmentId} is not a file; image omitted`);
      return undefined;
    }
    if (expectedBytes !== undefined && metadata.size !== expectedBytes) {
      this.notices.add(
        `stored image ${attachmentId} has ${metadata.size} bytes but the record says ${expectedBytes}; image omitted`,
      );
      return undefined;
    }
    const name = replayStr(ref.name);
    return {
      content: {
        type: "resource_link",
        uri: `dsh-attachment://${hex}`,
        name: name ?? "image",
        mimeType: mediaType,
        size: metadata.size,
      },
      descriptor: {
        kind: "image",
        attachmentId,
        mediaType,
        bytes: metadata.size,
        ...replayDimensions(ref),
        ...(name ? { name } : {}),
      },
    };
  }

  public async file(
    value: unknown,
  ): Promise<ReplayAttachmentContent | undefined> {
    const ref = replayRecord(value);
    const attachmentId = replayStr(ref.attachmentId);
    const hex = attachmentHex(attachmentId);
    const name = replayStr(ref.name);
    if (!hex || !attachmentId || !name || !isSafeLeafName(name)) {
      this.notices.add(
        `stored file reference ${attachmentId ?? "(missing id)"} is invalid; file omitted`,
      );
      return undefined;
    }
    const file = join(this.root, "files", hex.slice(0, 2), hex, name);
    let metadata;
    try {
      metadata = await stat(file);
    } catch (error) {
      this.notices.add(
        `stored file ${attachmentId} (${name}) is unavailable: ${asError(error).message}; file omitted`,
      );
      return undefined;
    }
    if (!metadata.isFile()) {
      this.notices.add(`stored file ${attachmentId} (${name}) is not a file; file omitted`);
      return undefined;
    }
    const expectedBytes = replayByteSize(ref.bytes);
    if (expectedBytes !== undefined && metadata.size !== expectedBytes) {
      this.notices.add(
        `stored file ${attachmentId} (${name}) has ${metadata.size} bytes but the record says ${expectedBytes}`,
      );
    }
    this.signal?.throwIfAborted();
    return {
      content: {
        type: "resource_link",
        uri: pathToFileURL(file).href,
        name,
        size: metadata.size,
      },
      descriptor: {
        kind: "file",
        attachmentId,
        name,
        bytes: metadata.size,
      },
    };
  }
}

/** Read one DSH image on demand for the client renderer. Replay itself never
 * decodes history images; this verifies the exact stored bytes and digest. */
export async function readDshImageAttachment(
  attachment: Pick<DshReplayAttachmentRef, "attachmentId" | "mediaType" | "bytes">,
  env: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const attachmentId = replayStr(attachment.attachmentId);
  const hex = attachmentHex(attachmentId);
  const mediaType = replayStr(attachment.mediaType);
  if (!hex || !attachmentId || !mediaType) {
    throw new Error("Invalid DSH image attachment reference");
  }
  const file = join(
    resolveDshHome(env),
    "attachments",
    "v1",
    "objects",
    hex.slice(0, 2),
    hex,
  );
  const expectedBytes = replayByteSize(attachment.bytes);
  const metadata = await stat(file);
  if (expectedBytes !== undefined && metadata.size !== expectedBytes) {
    throw new Error(
      `DSH image attachment ${attachmentId} has ${metadata.size} bytes, expected ${expectedBytes}`,
    );
  }
  const bytes = await readFile(file, { signal });
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new Error(
      `DSH image attachment ${attachmentId} changed while being read: ${bytes.length} bytes, expected ${expectedBytes}`,
    );
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== hex) {
    throw new Error(
      `DSH image attachment ${attachmentId} failed its sha256 integrity check`,
    );
  }
  return { bytes, mimeType: mediaType };
}

/** Map decoded DSH v4 records to ACP session/update frames incrementally. */
class ReplayAssembler {
  private readonly calls = new Map<
    string,
    { name: string; turn: number | undefined }
  >();
  private readonly results = new Set<string>();
  private readonly turnEnds = new Map<number, RecordValue>();

  public constructor(
    private readonly sessionId: string,
    private readonly attachments: ReplayAttachments,
    private readonly notices: ReplayNoticeBuffer,
  ) {}

  public async *accept(record: RecordValue): AsyncGenerator<AcpStreamMessage> {
    const type = replayStr(record.type);
    const data = replayRecord(record.data);
    if (type === "user/message") {
      yield* this.userMessage(data);
      return;
    }
    if (type === "assistant/message") {
      yield* this.assistantMessage(data);
      return;
    }
    if (type === "tool/call") {
      yield* this.toolCall(data);
      return;
    }
    if (type === "tool/result") {
      yield* this.toolResult(data);
      return;
    }
    if (type === "turn/end") {
      this.turnEnd(data);
    }
  }

  public *finish(): Generator<AcpStreamMessage> {
    for (const [callId, call] of this.calls) {
      if (this.results.has(callId)) {
        continue;
      }
      const reason =
        call.turn === undefined ? undefined : this.turnEnds.get(call.turn);
      const kind = replayStr(replayRecord(reason).kind);
      if (kind === "aborted" || kind === "interrupted" || kind === "error") {
        yield this.frame({
          sessionUpdate: "tool_call_update",
          toolCallId: callId,
          status: "failed",
          content: [],
        });
        this.notices.add(
          `tool call ${callId} (${call.name}) never stored a result because turn ${call.turn} ended with ${kind}; marked failed`,
        );
      } else {
        this.notices.add(
          `tool call ${callId} (${call.name}) has no stored result; left pending`,
        );
      }
    }
  }

  private async *userMessage(data: RecordValue): AsyncGenerator<AcpStreamMessage> {
    if (replayStr(data.role) !== "user") {
      return;
    }
    const source = replayStr(replayRecord(data.source).kind);
    if (source && source !== "user") return;
    const messageId = replayStr(data.id);
    for (const value of replayArray(data.content)) {
      const block = replayRecord(value);
      const type = replayStr(block.type) ?? "";
      if (type === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) {
          yield this.frame({
            sessionUpdate: "user_message_chunk",
            content: { type: "text", text },
            ...(messageId ? { messageId } : {}),
          });
        }
        continue;
      }
      if (type !== "image" && type !== "file") {
        continue;
      }
      const converted =
        type === "image"
          ? await this.attachments.image(block.attachment)
          : await this.attachments.file(block.attachment);
      if (!converted) {
        continue;
      }
      yield this.frame(
        this.withAttachment(
          {
            sessionUpdate: "user_message_chunk",
            content: converted.content,
            ...(messageId ? { messageId } : {}),
          },
          converted,
          messageId ? { messageId } : {},
        ),
      );
    }
  }

  private async *assistantMessage(
    data: RecordValue,
  ): AsyncGenerator<AcpStreamMessage> {
    const message = replayRecord(data.message);
    const messageId = replayStr(message.id);
    if (data.interrupted === true) {
      this.notices.add(
        `assistant message ${messageId ?? "(unknown)"} was interrupted; only its delivered prefix was stored`,
      );
    }
    for (const value of replayArray(message.content)) {
      const block = replayRecord(value);
      const type = replayStr(block.type) ?? "";
      if (type === "reasoning" || type === "thinking") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) {
          // DSH reuses the answer id for reasoning; disambiguate exactly as
          // projectThoughtMessageId does so Paseo keys the thought separately.
          yield this.frame({
            sessionUpdate: "agent_thought_chunk",
            content: { type: "text", text },
            ...(messageId ? { messageId: `${messageId}:thought` } : {}),
          });
        }
        continue;
      }
      if (type === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) {
          yield this.frame({
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text },
            ...(messageId ? { messageId } : {}),
          });
        }
        continue;
      }
      if (type !== "image" && type !== "file") {
        continue;
      }
      const converted =
        type === "image"
          ? await this.attachments.image(block.attachment)
          : await this.attachments.file(block.attachment);
      if (!converted) {
        continue;
      }
      yield this.frame(
        this.withAttachment(
          {
            sessionUpdate: "agent_message_chunk",
            content: converted.content,
            ...(messageId ? { messageId } : {}),
          },
          converted,
          messageId ? { messageId } : {},
        ),
      );
    }
  }

  private *toolCall(data: RecordValue): Generator<AcpStreamMessage> {
    const callId = replayStr(data.callId);
    if (!callId) {
      this.notices.add("tool call record has no callId; ignored");
      return;
    }
    const name = replayStr(data.name) ?? "tool";
    const turn = replayNumber(data.turn);
    this.calls.set(callId, { name, turn });
    yield this.frame({
      sessionUpdate: "tool_call",
      toolCallId: callId,
      name,
      title: name,
      kind: "other",
      // A stored call without a stored result never completed; `pending` is the
      // honest ACP state and finish() upgrades it only with turn-end evidence.
      status: "pending",
      rawInput: replayParseInput(data.arguments),
      content: [],
    });
  }

  private async *toolResult(
    data: RecordValue,
  ): AsyncGenerator<AcpStreamMessage> {
    const message = replayRecord(data.message);
    const callId =
      replayStr(message.toolCallId) ??
      replayStr(replayRecord(message.source).callId);
    if (!callId) {
      this.notices.add("tool result record has no callId; ignored");
      return;
    }
    if (!this.calls.has(callId)) {
      this.notices.add(
        `tool result for unknown call ${callId}; not shown in the replayed timeline`,
      );
      return;
    }
    if (this.results.has(callId)) {
      this.notices.add(`duplicate tool result for ${callId}; latest ignored`);
      return;
    }
    this.results.add(callId);
    const failed =
      message.isError === true || isRecord(data.error);
    const converted: RecordValue[] = [];
    const images: Array<{ content: RecordValue; meta: RecordValue }> = [];
    for (const value of replayArray(message.content)) {
      const block = replayRecord(value);
      const type = replayStr(block.type) ?? "";
      if (type === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) {
          converted.push({ type: "content", content: { type: "text", text } });
        }
        continue;
      }
      if (type !== "image" && type !== "file") {
        continue;
      }
      const attachment =
        type === "image"
          ? await this.attachments.image(block.attachment)
          : await this.attachments.file(block.attachment);
      if (!attachment) {
        continue;
      }
      const meta = this.attachmentMetadata(attachment, {
        toolCallId: callId,
      });
      converted.push({
        type: "content",
        content: attachment.content,
        _meta: meta,
      });
      if (attachment.descriptor.kind === "image") {
        images.push({ content: converted[converted.length - 1]!, meta });
      }
    }
    const update: RecordValue = {
      sessionUpdate: "tool_call_update",
      toolCallId: callId,
      status: failed ? "failed" : "completed",
      content: converted,
      rawOutput: { content: converted },
    };
    if (images.length > 0) {
      update._meta = images[0]!.meta;
    }
    yield this.frame(update);
    // The timeline transformer attaches one image per update; preserve every
    // additional tool-result image with its own metadata instead of dropping it.
    for (const image of images.slice(1)) {
      yield this.frame({
        sessionUpdate: "tool_call_update",
        toolCallId: callId,
        status: failed ? "failed" : "completed",
        content: [image.content],
        _meta: image.meta,
      });
    }
  }

  private turnEnd(data: RecordValue): void {
    const turn = replayNumber(data.turn);
    if (turn === undefined) {
      return;
    }
    const reason = replayRecord(data.reason);
    this.turnEnds.set(turn, reason);
    const kind = replayStr(reason.kind);
    if (kind !== "aborted" && kind !== "interrupted" && kind !== "error") {
      return;
    }
    const failure = replayRecord(reason.error);
    const detail =
      replayStr(failure.message) ?? replayStr(reason.message) ?? "";
    this.notices.add(
      `turn ${turn} ended with ${kind}${detail ? `: ${detail}` : ""}`,
    );
  }

  private withAttachment(
    update: RecordValue,
    attachment: ReplayAttachmentContent,
    ids: ReplayAttachmentIds,
  ): RecordValue {
    return {
      ...update,
      _meta: this.attachmentMetadata(attachment, ids),
    };
  }

  /** Image payloads match `shared/history-attachments.ts` exactly: the client
   * renderer only accepts a single image reference per timeline item. */
  private attachmentMetadata(
    attachment: ReplayAttachmentContent,
    ids: ReplayAttachmentIds,
  ): RecordValue {
    const { kind, ...reference } = attachment.descriptor;
    return {
      "deepseek-harness": {
        type: kind === "image" ? "history-attachment" : "history-file",
        sessionId: this.sessionId,
        ...(ids.messageId ? { messageId: ids.messageId } : {}),
        ...(ids.toolCallId ? { toolCallId: ids.toolCallId } : {}),
        attachment: reference,
      },
    };
  }

  private frame(update: RecordValue): AcpStreamMessage {
    return replayFrame(this.sessionId, update);
  }
}

/**
 * Stream one resumed session's transcript as ACP session/update notifications.
 * A missing or damaged store degrades to an empty timeline plus a summarized
 * notice; it never fails the resume and never fabricates completion.
 */
export async function* replayDshSession(
  sessionId: string,
  context: ReplayContext,
  signal?: AbortSignal,
): AsyncGenerator<AcpStreamMessage> {
  const notices = new ReplayNoticeBuffer(sessionId, context.onReplayNotice);
  try {
    if (!isSafeSessionId(sessionId)) {
      notices.add(`invalid DSH session id "${sessionId}"; history was not replayed`);
      return;
    }
    const home = resolveDshHome(context.env);
    const file = await locateDshSessionFile(home, sessionId);
    if (!file) {
      notices.add(
        `no stored DSH transcript was found for session ${sessionId}; the resumed session keeps its model context but its timeline cannot be replayed`,
      );
      return;
    }
    const attachments = new ReplayAttachments(home, signal, notices);
    const assembler = new ReplayAssembler(sessionId, attachments, notices);
    let records = 0;
    for await (const record of decodeDshSessionRecords(
      file,
      signal,
      notices,
    )) {
      signal?.throwIfAborted();
      yield* assembler.accept(record);
      records += 1;
      if (records % 512 === 0) {
        // Long logs must not monopolize the daemon's event loop while replaying.
        await setImmediatePromise();
      }
    }
    yield* assembler.finish();
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    notices.add(`history replay failed: ${asError(error).message}`);
  } finally {
    notices.flush();
  }
}

function attachmentHex(attachmentId: string | undefined): string | undefined {
  if (!attachmentId) {
    return undefined;
  }
  return /^sha256:([a-f0-9]{64})$/.exec(attachmentId)?.[1];
}

function isSafeLeafName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== "." &&
    name !== ".." &&
    !name.includes("/") &&
    !name.includes("\\") &&
    basename(name) === name
  );
}

function replayByteSize(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : undefined;
}

function replayDimensions(ref: RecordValue): {
  width?: number;
  height?: number;
} {
  const width = replayByteSize(ref.width);
  const height = replayByteSize(ref.height);
  return {
    ...(width !== undefined && width > 0 ? { width } : {}),
    ...(height !== undefined && height > 0 ? { height } : {}),
  };
}

function replayNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function replayArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function replayFrame(sessionId: string, update: RecordValue): AcpStreamMessage {
  return {
    jsonrpc: "2.0",
    method: "session/update",
    params: { sessionId, update },
  } as unknown as AcpStreamMessage;
}

function replayRecord(value: unknown): RecordValue {
  return isRecord(value) ? value : {};
}

function replayStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function replayParseInput(value: unknown): unknown {
  if (typeof value !== "string") {
    return value ?? null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function assertAcpStreamMessage(value: AnyMessage): AcpStreamMessage {
  if (!isRecord(value) || value.jsonrpc !== "2.0") {
    throw new Error("DeepSeek Harness ACP received an invalid JSON-RPC frame");
  }
  const record = value as unknown as RecordValue;

  const hasMethod = hasOwn(record, "method");
  const hasId = hasOwn(record, "id");
  const hasResult = hasOwn(record, "result");
  const hasError = hasOwn(record, "error");

  if (hasMethod) {
    if (typeof record.method !== "string" || record.method.length === 0) {
      throw new Error("DeepSeek Harness ACP received an invalid RPC method");
    }
    if (hasId && !isRpcId(record.id)) {
      throw new Error("DeepSeek Harness ACP received an invalid RPC id");
    }
    if (hasResult || hasError) {
      throw new Error("DeepSeek Harness ACP received a mixed RPC frame");
    }
    return value as unknown as AcpStreamMessage;
  }

  if (!hasId || !isRpcId(record.id)) {
    throw new Error("DeepSeek Harness ACP received an invalid RPC response id");
  }
  if (hasResult === hasError) {
    throw new Error("DeepSeek Harness ACP received an invalid RPC response");
  }
  if (hasError && !isRpcError(record.error)) {
    throw new Error("DeepSeek Harness ACP received an invalid RPC error");
  }
  return value as unknown as AcpStreamMessage;
}

function isRequestFrame(
  value: AcpStreamMessage,
): value is AcpStreamMessage & {
  method: string;
  id: string | number | null;
} {
  const record = value as unknown as RecordValue;
  return (
    isRecord(record) &&
    hasOwn(record, "method") &&
    hasOwn(record, "id") &&
    typeof record.method === "string" &&
    isRpcId(record.id)
  );
}

function isNotificationFrame(
  value: AcpStreamMessage,
): value is AcpStreamMessage & { method: string; params?: unknown } {
  const record = value as unknown as RecordValue;
  return (
    isRecord(record) &&
    hasOwn(record, "method") &&
    !hasOwn(record, "id") &&
    typeof record.method === "string"
  );
}

function isResponseFrame(
  value: AcpStreamMessage,
): value is AcpStreamMessage & {
  id: string | number | null;
  result?: unknown;
  error?: unknown;
} {
  const record = value as unknown as RecordValue;
  return (
    isRecord(record) &&
    !hasOwn(record, "method") &&
    hasOwn(record, "id") &&
    isRpcId(record.id) &&
    hasOwn(record, "result") !== hasOwn(record, "error")
  );
}

function isLoadSessionParams(value: unknown): value is RecordValue {
  return (
    isRecord(value) &&
    typeof value.sessionId === "string" &&
    typeof value.cwd === "string" &&
    Array.isArray(value.mcpServers)
  );
}

function validateLoadCapability(capabilities: RecordValue): boolean {
  if (
    hasOwn(capabilities, "loadSession") &&
    capabilities.loadSession !== undefined &&
    typeof capabilities.loadSession !== "boolean"
  ) {
    throw new Error(
      "DeepSeek Harness ACP initialize returned invalid loadSession capability",
    );
  }
  return capabilities.loadSession === true;
}

function isRpcId(value: unknown): value is string | number | null {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isRpcError(value: unknown): value is RecordValue {
  return (
    isRecord(value) &&
    typeof value.code === "number" &&
    Number.isFinite(value.code) &&
    typeof value.message === "string"
  );
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: RecordValue, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertConnectorOpen(
  context: DshConnectorContext,
  phase: string,
): void {
  if (context.isClosed?.()) {
    throw new Error("DeepSeek Harness connector closed " + phase);
  }
}

async function registerConnectorResource(
  context: DshConnectorContext,
  resource: ConnectorResource,
  phase: string,
): Promise<void> {
  const reason = new Error(
    "DeepSeek Harness connector closed while registering " + phase,
  );
  if (context.isClosed?.()) {
    await resource.close(reason);
    throw reason;
  }

  context.resources.add(resource);
  if (!context.isClosed?.()) {
    return;
  }

  context.resources.delete(resource);
  try {
    await resource.close(reason);
  } catch (error) {
    throw new AggregateError(
      [reason, error],
      "DeepSeek Harness connector failed to close " + phase,
    );
  }
  throw reason;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function diagnosticSuffix(value: string): string {
  const diagnostic = redactDiagnostic(value);
  return diagnostic ? " Diagnostic: " + diagnostic : "";
}

class BoundedCapture {
  private text = "";

  public constructor(private readonly limit: number) {}

  public append(chunk: unknown): void {
    if (this.text.length >= this.limit) {
      return;
    }
    const value =
      typeof chunk === "string"
        ? chunk
        : Buffer.from(chunk as Uint8Array).toString("utf8");
    this.text += value.slice(0, this.limit - this.text.length);
  }

  public get value(): string {
    return this.text;
  }
}

class ChildProcessOwner implements AcpStreamOwner {
  private readonly listeners = new Set<(error: Error) => void>();
  private failure: Error | undefined;
  private closed = false;
  private closePromise: Promise<void> | undefined;
  private exitedValue = false;

  public constructor(
    private readonly child: ChildProcess,
    private readonly command: string,
    private readonly diagnostics: () => string,
  ) {
    child.once("error", (error) => {
      this.reportFailure(
        new Error(
          "DeepSeek Harness ACP process failed for " +
            command +
            "." +
            diagnosticSuffix(this.diagnostics()),
          { cause: error },
        ),
      );
    });
    child.once("close", (code, signal) => {
      this.exitedValue = true;
      if (!this.closed) {
        this.reportFailure(
          new Error(
            "DeepSeek Harness ACP process exited (" +
              (signal ?? code ?? "unknown") +
              ")." +
              diagnosticSuffix(this.diagnostics()),
          ),
        );
      }
    });
  }

  public get hasExited(): boolean {
    return (
      this.exitedValue ||
      this.child.exitCode !== null ||
      this.child.signalCode !== null
    );
  }

  public onFailure(listener: (error: Error) => void): () => void {
    this.listeners.add(listener);
    if (this.failure) {
      queueMicrotask(() => listener(this.failure as Error));
    }
    return () => this.listeners.delete(listener);
  }

  public close(reason?: unknown): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }
    this.closed = true;
    this.closePromise = terminateChild(
      this.child,
      () => this.hasExited,
      reason,
    );
    return this.closePromise;
  }

  private reportFailure(error: Error): void {
    if (this.closed || this.failure) {
      return;
    }
    this.failure = error;
    for (const listener of this.listeners) {
      listener(error);
    }
    void this.close(error).catch(() => undefined);
  }
}

/** Checks the Node and DSH versions with the daemon-resolved launch. */
export async function checkDshStatus(
  launch: ProviderLaunch,
  cwd = process.cwd(),
): Promise<ProviderStatus> {
  try {
    assertSupportedNodeVersion();
    await probeDshVersion(launch, cwd, launch.env, {
      launch,
      cwd,
      env: {},
      resources: new Set(),
    });
    return { available: true };
  } catch (error) {
    return { available: false, diagnostic: asError(error).message };
  }
}

async function probeDshVersion(
  launch: ProviderLaunch,
  cwd: string,
  env: Record<string, string>,
  context: DshConnectorContext,
): Promise<void> {
  assertConnectorOpen(context, "before version probe");
  const { command } = launch;
  let child: ChildProcess;
  try {
    child = spawnProcess(command, [...launch.args, "--version"], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw launchPathError(command, cwd, error);
  }

  const stdout = new BoundedCapture(STDERR_CAPTURE_LIMIT);
  const stderr = new BoundedCapture(STDERR_CAPTURE_LIMIT);
  child.stdout?.on("data", (chunk: unknown) => stdout.append(chunk));
  child.stderr?.on("data", (chunk: unknown) => stderr.append(chunk));
  const owner = new ChildProcessOwner(child, command, () => stderr.value);

  try {
    await registerConnectorResource(context, owner, "version probe");
    const result = await waitForProbe(child);
    assertConnectorOpen(context, "during version probe");
    if (result.error) {
      if (isMissingPathError(result.error)) {
        throw launchPathError(command, cwd, result.error);
      }
      throw new Error(
        "DeepSeek Harness version probe could not run " +
          command +
          "." +
          diagnosticSuffix(stderr.value),
        { cause: result.error },
      );
    }
    if (result.timedOut) {
      throw new Error(
        "DeepSeek Harness version probe timed out after " +
          VERSION_PROBE_TIMEOUT_MS +
          "ms for " +
          command +
          "." +
          diagnosticSuffix(stderr.value),
      );
    }
    if (result.code !== 0 || result.signal !== null) {
      throw new Error(
        "DeepSeek Harness version probe failed for " +
          command +
          " with exit " +
          (result.signal ?? result.code ?? "unknown") +
          "." +
          diagnosticSuffix(stdout.value + "\n" + stderr.value),
      );
    }

    const version = extractDshVersion(stdout.value + "\n" + stderr.value);
    if (!isSupportedDshVersion(version)) {
      throw new Error(
        "Unsupported DeepSeek Harness version " +
          (version ?? "unknown") +
          ". This plugin requires DeepSeek Harness " +
          MINIMUM_DSH_VERSION +
          " or newer; upgrade DSH or point agents.providers.deepseek-harness.command at the intended executable." +
          diagnosticSuffix(stdout.value + "\n" + stderr.value),
      );
    }
  } finally {
    await owner.close(new Error("DeepSeek Harness version probe finished")).catch(
      () => undefined,
    );
    context.resources.delete(owner);
  }
}

interface ProbeResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
  timedOut: boolean;
}

function waitForProbe(child: ChildProcess): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let spawnError: Error | undefined;

    const finish = (result: Omit<ProbeResult, "timedOut">): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      child.off("error", onError);
      child.off("close", onClose);
      resolve({ ...result, timedOut });
    };

    const onError = (error: Error): void => {
      spawnError = asError(error);
      if (child.exitCode !== null || child.signalCode !== null) {
        finish({
          code: child.exitCode,
          signal: child.signalCode,
          error: spawnError,
        });
      }
    };
    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish({
        code,
        signal,
        error: spawnError,
      });
    };
    child.once("error", onError);
    child.once("close", onClose);
    timer = setTimeout(() => {
      // The cleanup-triggered close event normally wins this race. Latch the
      // deadline first so exit 143/SIGTERM cannot conceal the timeout cause.
      timedOut = true;
      void terminateChild(child, () => child.exitCode !== null || child.signalCode !== null)
        .catch(() => undefined)
        .finally(() =>
          finish({
            code: child.exitCode,
            signal: child.signalCode,
            error: spawnError,
          }),
        );
    }, VERSION_PROBE_TIMEOUT_MS);
  });
}

function waitForChildSpawn(child: ChildProcess): Promise<void> {
  if (child.pid !== undefined && child.pid !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("DeepSeek Harness ACP process did not spawn in time"));
    }, STARTUP_TIMEOUT_MS);
    const onSpawn = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      child.off("spawn", onSpawn);
      child.off("error", onError);
    };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
}

async function terminateChild(
  child: ChildProcess,
  hasExited: () => boolean,
  reason?: unknown,
): Promise<void> {
  if (hasExited()) {
    return;
  }

  // On Windows terminateProcess force-stops the whole tree at once, including
  // DSH behind a .cmd launcher; elsewhere it sends the signal to the child.
  let firstKillError: unknown;
  try {
    await terminateProcess(child, "SIGTERM");
  } catch (error) {
    firstKillError = error;
  }
  if (await waitForChildClose(child, hasExited, SHUTDOWN_SIGNAL_TIMEOUT_MS)) {
    return;
  }

  let secondKillError: unknown;
  try {
    await terminateProcess(child, "SIGKILL");
  } catch (error) {
    secondKillError = error;
  }
  if (await waitForChildClose(child, hasExited, SHUTDOWN_SIGNAL_TIMEOUT_MS)) {
    return;
  }

  throw new Error(
    "DeepSeek Harness ACP process did not terminate after SIGTERM and SIGKILL." +
      (reason ? " Cleanup reason: " + asError(reason).message : "") +
      (firstKillError ? " SIGTERM: " + asError(firstKillError).message : "") +
      (secondKillError ? " SIGKILL: " + asError(secondKillError).message : ""),
  );
}

function waitForChildClose(
  child: ChildProcess,
  hasExited: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  if (hasExited()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => finish(false), timeoutMs);
    const onClose = (): void => finish(true);
    const finish = (value: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      child.off("close", onClose);
      resolve(value || hasExited());
    };
    child.once("close", onClose);
    if (hasExited()) {
      finish(true);
    }
  });
}

function isMissingPathError(error: Error): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function launchPathError(command: string, cwd: string, cause: unknown): Error {
  return new Error(
    "DeepSeek Harness could not start executable " +
      command +
      " in working directory " + cwd +
      ". Check that both the executable and working directory exist. Install the official DeepSeek Harness package, or set agents.providers.deepseek-harness.command in the Paseo config to its path.",
    { cause },
  );
}
