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
    onError: () => void;
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

  function scheduleReconnect(): void {
    const delay = nextDelay;
    nextDelay = Math.min(nextDelay * 2, backoff.maxMs);
    setTimeout(connect, delay);
  }

  function connect(): void {
    handle = config.factory.open({
      url: config.url,
      token: config.getToken(), // pulled fresh on every (re)connect
      lastEventId, // replay anything missed while disconnected
      onEvent: dispatch,
      onError: scheduleReconnect, // reopen after a backoff delay
    });
  }

  function start(): void {
    connect();
  }

  function stop(): void {
    handle?.close();
    handle = null;
  }

  return { start, stop, on };
}
