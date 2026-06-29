export type StreamEvent = { id?: string; type: string; data: unknown };

export interface StreamHandle {
  close(): void;
}

export interface StreamFactory {
  open(opts: {
    url: string;
    token: string;
    lastEventId?: string;
    onEvent: (e: StreamEvent) => void;
    onError: (code?: number) => void;
  }): StreamHandle;
}

export interface LiveSync {
  start(): void;
  stop(): void;
  on(type: string, handler: (data: unknown) => void): () => void;
}

export interface LiveSyncConfig {
  url: string;
  getToken: () => string;
  factory: StreamFactory;
  // Returns a stable key for events that must be delivered at most once (e.g. a
  // cry-episode id), or undefined for events that may repeat. Guards against a
  // Last-Event-ID replay re-firing a safety alert.
  dedupeKey?: (event: StreamEvent) => string | undefined;
  // Reconnect backoff. Delays reopen attempts so a persistent failure doesn't
  // hammer the backend in a tight loop.
  backoff?: { baseMs: number; maxMs: number };
  // Called when the stream closes with a 401 (token expired). The callback
  // should attempt a token refresh; if it resolves, LiveSync will reconnect
  // with a fresh token. If it rejects, LiveSync stops and will not reconnect.
  onAuthError?: () => Promise<void>;
}

const DEFAULT_BACKOFF = { baseMs: 1000, maxMs: 30000 };

export function createLiveSync(config: LiveSyncConfig): LiveSync {
  const handlers = new Map<string, Set<(data: unknown) => void>>();

  function on(type: string, handler: (data: unknown) => void): () => void {
    const set = handlers.get(type) ?? new Set();
    set.add(handler);
    handlers.set(type, set);
    return () => set.delete(handler);
  }

  const backoff = config.backoff ?? DEFAULT_BACKOFF;
  let handle: StreamHandle | null = null;
  let lastEventId: string | undefined;
  let nextDelay = backoff.baseMs;
  const seenKeys = new Set<string>();
  // Guards against connection leaks. `running` is true between start() and stop();
  // `reconnectTimer` holds at most one pending reopen so a doubled error can't
  // schedule two; `generation` bumps on every (re)connect so a superseded stream's
  // late onEvent/onError callbacks are ignored instead of spawning a rival stream.
  let running = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function dispatch(event: StreamEvent): void {
    nextDelay = backoff.baseMs; // a delivered event proves the connection is healthy
    if (event.id !== undefined) lastEventId = event.id;
    const key = config.dedupeKey?.(event);
    if (key !== undefined) {
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
    }
    for (const handler of handlers.get(event.type) ?? []) handler(event.data);
  }

  function scheduleReconnect(code?: number): void {
    if (code === 401) {
      // Token expired: attempt a refresh before reconnecting. If the refresh
      // callback is absent or rejects, stop reconnecting entirely.
      if (!config.onAuthError) {
        stop();
        return;
      }
      config.onAuthError().then(
        () => {
          // Refresh succeeded — reconnect immediately (no backoff penalty for
          // a token rotation; the connection itself was healthy up to this point).
          connect();
        },
        () => {
          // Refresh failed — caller is responsible for logging out; stop here.
          stop();
        },
      );
      return;
    }

    // A single error must schedule exactly one reopen. If one is already pending
    // (e.g. the transport fired both onclose and onerror), ignore the duplicate
    // so reconnects can't multiply into a stream of concurrent connections.
    if (reconnectTimer !== null) return;
    const delay = nextDelay;
    nextDelay = Math.min(nextDelay * 2, backoff.maxMs);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect(): void {
    if (!running) return; // stopped (or never started) — don't open a stream
    handle?.close(); // never leave a previous stream open — that would leak connections
    clearReconnectTimer();
    const myGeneration = ++generation;
    const active = () => running && myGeneration === generation;
    handle = config.factory.open({
      url: config.url,
      token: config.getToken(), // pulled fresh on every (re)connect
      lastEventId, // replay anything missed while disconnected
      onEvent: (event) => {
        if (active()) dispatch(event);
      },
      onError: (code) => {
        if (active()) scheduleReconnect(code);
      },
    });
  }

  function start(): void {
    running = true;
    connect(); // closes any prior stream first, so repeated start()s never stack
  }

  function stop(): void {
    running = false;
    clearReconnectTimer();
    generation++; // invalidate in-flight callbacks from the connection we're closing
    handle?.close();
    handle = null;
  }

  return { start, stop, on };
}
