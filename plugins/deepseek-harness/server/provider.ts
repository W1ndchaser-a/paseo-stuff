import { AsyncLocalStorage } from "node:async_hooks";
import { runAcpProvider } from "@getpaseo/plugin/server/acp";
import { historyAttachmentTransformer, registerReplayHome } from "./history-attachments";
import type {
  ProviderConnection,
  ProviderEvent,
  ProviderInput,
  ProviderLaunch,
  ProviderRegistration,
} from "@getpaseo/plugin/server/provider";
import {
  checkDshStatus,
  createDshAcpStream,
  type ConnectorResource,
  type DshConnectorContext,
} from "./dsh-compatibility";

const MISSING_LAUNCH =
  "DeepSeek Harness requires Paseo 0.11 or newer, which supplies the resolved dsh launch";
const CLOSE_TIMEOUT_MS = 5_000;
const COMMAND_CAPABILITY = "prompt.command";

export interface DeepSeekHarnessProviderOptions {
  startupTimeoutMs?: number;
  profile?: "acp" | "acp-daily";
}

export interface ManagedDeepSeekHarnessProvider extends ProviderRegistration {
  dispose(): Promise<void>;
}

interface InputContext {
  cwd: string;
  env: Readonly<Record<string, string>>;
}

interface ConnectionScope extends InputContext {
  launch: ProviderLaunch;
  resources: Set<ConnectorResource>;
  closed: boolean;
  closeConnection?: () => Promise<void>;
  closePromise?: Promise<void>;
  resourceClosePromise?: Promise<void>;
  onReplayNotice?: DshConnectorContext["onReplayNotice"];
}

export function createDeepSeekHarnessProvider(
  options: DeepSeekHarnessProviderOptions = {},
): ManagedDeepSeekHarnessProvider {
  validateOptions(options);
  const profile = options.profile ?? "acp";
  const daily = profile === "acp-daily";

  const storage = new AsyncLocalStorage<ConnectionScope>();
  const scopes = new Set<ConnectionScope>();
  const pendingConnects = new Set<Promise<ProviderConnection>>();
  let disposed = false;
  let disposePromise: Promise<void> | undefined;
  const delegate = runAcpProvider({
    id: daily ? "deepseek-harness-daily" : "deepseek-harness",
    label: daily ? "DSH · 日常" : "DSH · 逆向",
    description: daily
      ? "DeepSeek Harness without the REA tool catalog."
      : "DeepSeek Harness with the complete REA tool catalog.",
    icon: "icon.svg",
    transformers: [historyAttachmentTransformer],
    ...(options.startupTimeoutMs === undefined
      ? {}
      : { acpOptions: { startupTimeoutMs: options.startupTimeoutMs } }),
    connector: () => {
      const scope = storage.getStore();
      if (!scope) {
        throw new Error(
          "DeepSeek Harness connector was requested without an input context",
        );
      }
      const context: DshConnectorContext = {
        launch: scope.launch,
        cwd: scope.cwd,
        env: scope.env,
        resources: scope.resources,
        isClosed: () => scope.closed,
        onReplayNotice: scope.onReplayNotice,
      };
      return createDshAcpStream(context);
    },
  });

  const closeScopeResources = (scope: ConnectionScope): Promise<void> => {
    if (!scope.resourceClosePromise) {
      scope.resourceClosePromise = closeResources(scope.resources);
    }
    return scope.resourceClosePromise;
  };

  const closeScope = (
    scope: ConnectionScope,
    connection: ProviderConnection,
  ): Promise<void> => {
    if (scope.closePromise) {
      return scope.closePromise;
    }
    scope.closed = true;

    let delegateClose: Promise<void>;
    try {
      delegateClose = connection.close();
    } catch (error) {
      delegateClose = Promise.reject(error);
    }
    void delegateClose.catch(() => undefined);

    const resourceClose = closeScopeResources(scope);
    scope.closePromise = (async () => {
      const results = await Promise.allSettled([
        resourceClose,
        withTimeout(
          delegateClose,
          CLOSE_TIMEOUT_MS,
          "DeepSeek Harness provider close timed out",
        ),
      ]);
      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        )
        .map((result) => result.reason);
      if (errors.length === 1) {
        throw errors[0];
      }
      if (errors.length > 1) {
        throw new AggregateError(
          errors,
          "DeepSeek Harness provider cleanup failed",
        );
      }
    })();
    void scope.closePromise.then(
      () => scopes.delete(scope),
      () => scopes.delete(scope),
    );
    return scope.closePromise;
  };

  const connectScope = async (
    scope: ConnectionScope,
    request: Parameters<ProviderRegistration["connect"]>[0],
  ): Promise<ProviderConnection> => {
    let connection: ProviderConnection;
    try {
      connection = await storage.run(scope, () => delegate.connect(request));
    } catch (error) {
      let resourceError: unknown;
      try {
        await closeScopeResources(scope);
      } catch (cleanupError) {
        resourceError = cleanupError;
      }
      scopes.delete(scope);
      if (resourceError !== undefined) {
        throw new AggregateError(
          [error, resourceError],
          "DeepSeek Harness provider connect cleanup failed",
        );
      }
      throw error;
    }

    scope.closeConnection = () => closeScope(scope, connection);
    if (disposed || scope.closed) {
      scope.closed = true;
      try {
        await scope.closeConnection();
      } catch (error) {
        throw new AggregateError(
          [
            new Error(
              "DeepSeek Harness provider was closed while connecting",
            ),
            error,
          ],
          "DeepSeek Harness provider connect cleanup failed",
        );
      }
      throw new Error("DeepSeek Harness provider was closed while connecting");
    }

    const capabilities = withoutUnsupportedCapabilities(
      request.capabilities.includes("timeline.plugin")
        ? [...connection.capabilities, "timeline.plugin"]
        : connection.capabilities,
    );
    const listeners = new Set<(event: ProviderEvent) => void>();
    const openedSessions = new Set<string>();
    const notices = new Map<string, Extract<ProviderEvent, { type: "session.notice" }>>();
    const emit = (event: ProviderEvent) => {
      for (const listener of listeners) listener(event);
    };
    const unsubscribe = connection.onEvent((event) => {
      emit(filterProviderEvent(event));
      if (event.type === "session.opened") {
        openedSessions.add(event.sessionId);
        const notice = notices.get(event.sessionId);
        if (notice) {
          notices.delete(event.sessionId);
          emit(notice);
        }
      } else if (event.type === "session.closed") {
        openedSessions.delete(event.sessionId);
        notices.delete(event.sessionId);
      }
    });
    scope.closeConnection = async () => {
      try {
        await closeScope(scope, connection);
      } finally {
        unsubscribe();
        listeners.clear();
        openedSessions.clear();
        notices.clear();
      }
    };
    return {
      version: connection.version,
      capabilities,
      async send(input) {
        if (scope.closed) {
          throw new Error("DeepSeek Harness provider connection is closed");
        }
        if (isCommandPrompt(input)) {
          throw new Error(
            "DeepSeek Harness ACP does not support provider commands",
          );
        }
        const inputContext = contextForInput(input);
        if (input.type === "session.open") {
          openedSessions.delete(input.sessionId);
          notices.delete(input.sessionId);
          registerReplayHome(input.persistence, { ...scope.launch.env, ...input.config.env });
        }
        const inputScope: ConnectionScope = {
          ...inputContext,
          launch: scope.launch,
          resources: scope.resources,
          onReplayNotice: input.type === "session.open"
            ? ({ message }) => {
                if (scope.closed) return;
                const event: Extract<ProviderEvent, { type: "session.notice" }> = {
                  type: "session.notice",
                  sessionId: input.sessionId,
                  notice: {
                    id: "dsh-history-replay",
                    severity: "warning",
                    title: "历史回放不完整",
                    description: message,
                  },
                };
                if (openedSessions.has(input.sessionId)) emit(event);
                else notices.set(input.sessionId, event);
              }
            : undefined,
          get closed() {
            return scope.closed;
          },
        };
        return storage.run(inputScope, () => connection.send(input));
      },
      onEvent(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      close: scope.closeConnection,
    };
  };

  const registration: ManagedDeepSeekHarnessProvider = {
    ...delegate,
    command: ["dsh", "--profile", profile],
    async status(request) {
      if (!request.launch) {
        return { available: false, diagnostic: MISSING_LAUNCH };
      }
      return checkDshStatus(request.launch);
    },
    async connect(request) {
      if (disposed) {
        throw new Error("DeepSeek Harness provider has been disposed");
      }
      if (!request.launch) {
        throw new Error(MISSING_LAUNCH);
      }

      const resources = new Set<ConnectorResource>();
      const scope: ConnectionScope = {
        launch: request.launch,
        cwd: process.cwd(),
        env: {},
        resources,
        closed: false,
      };
      scopes.add(scope);
      const pending = connectScope(scope, request);
      pendingConnects.add(pending);
      try {
        return await pending;
      } finally {
        pendingConnects.delete(pending);
      }
    },
    dispose() {
      if (disposePromise) {
        return disposePromise;
      }
      disposed = true;
      const scopesAtDispose = [...scopes];
      const pendingAtDispose = [...pendingConnects];
      for (const scope of scopesAtDispose) {
        scope.closed = true;
      }
      disposePromise = (async () => {
        const errors: unknown[] = [];
        const tracked = new Set<Promise<unknown>>();

        const waitForCleanup = async (
          operations: readonly Promise<unknown>[],
        ): Promise<void> => {
          const fresh = operations.filter((operation) => {
            if (tracked.has(operation)) {
              return false;
            }
            tracked.add(operation);
            return true;
          });
          const results = await Promise.allSettled(fresh);
          for (const result of results) {
            if (result.status === "rejected") {
              errors.push(result.reason);
            }
          }
        };

        await waitForCleanup(
          scopesAtDispose.map((scope) =>
            scope.closeConnection
              ? scope.closeConnection()
              : closeScopeResources(scope),
          ),
        );
        await Promise.allSettled(pendingAtDispose);

        while (true) {
          const lateClosing = [...scopes]
            .map((scope) => scope.closePromise ?? scope.resourceClosePromise)
            .filter((operation): operation is Promise<void> =>
              operation !== undefined,
            );
          const freshClosing = lateClosing.filter(
            (operation) => !tracked.has(operation),
          );
          if (freshClosing.length === 0) {
            break;
          }
          await waitForCleanup(freshClosing);
        }

        scopes.clear();
        for (const pending of pendingAtDispose) {
          pendingConnects.delete(pending);
        }
        if (errors.length === 1) {
          throw errors[0];
        }
        if (errors.length > 1) {
          throw new AggregateError(
            errors,
            "DeepSeek Harness provider dispose failed",
          );
        }
      })();
      return disposePromise;
    },
  };
  return registration;
}

export const createProvider = createDeepSeekHarnessProvider;

function contextForInput(input: ProviderInput): InputContext {
  if (input.type === "session.open") {
    return {
      cwd: input.config.cwd,
      env: { ...input.config.env },
    };
  }
  if (input.type === "catalog" || input.type === "sessions") {
    return {
      cwd: input.cwd ?? process.cwd(),
      env: {},
    };
  }
  return {
    cwd: process.cwd(),
    env: {},
  };
}

function isCommandPrompt(input: ProviderInput): boolean {
  return (
    input.type === "session.prompt" && input.prompt.input.type === "command"
  );
}

function withoutUnsupportedCapabilities(
  capabilities: readonly string[],
): readonly string[] {
  return capabilities.filter(
    (capability) => capability !== COMMAND_CAPABILITY,
  );
}

function filterProviderEvent(event: ProviderEvent): ProviderEvent {
  if (event.type !== "session.opened") {
    return event;
  }
  return {
    ...event,
    capabilities: withoutUnsupportedCapabilities(event.capabilities),
  };
}

async function closeResources(
  resources: Set<ConnectorResource>,
): Promise<void> {
  const results = await Promise.allSettled(
    [...resources].map(async (resource) => {
      await resource.close(
        new Error("Paseo closed the DeepSeek Harness provider"),
      );
    }),
  );
  const errors = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) => result.reason);
  resources.clear();
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      "DeepSeek Harness child process cleanup failed",
    );
  }
}

async function withTimeout(
  promise: Promise<void>,
  timeoutMs: number,
  message: string,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function validateOptions(options: DeepSeekHarnessProviderOptions): void {
  if (
    options.startupTimeoutMs !== undefined &&
    (!Number.isFinite(options.startupTimeoutMs) ||
      options.startupTimeoutMs <= 0)
  ) {
    throw new Error("DeepSeek Harness startupTimeoutMs must be positive");
  }
}
