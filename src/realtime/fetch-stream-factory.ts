import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { StreamFactory } from "./live-sync";

// Concrete transport for LiveSync. Uses @microsoft/fetch-event-source (NOT native
// EventSource) so the bearer token rides as an Authorization header. Reconnect,
// backoff and dedup are owned by LiveSync — this factory surfaces a dropped/closed
// connection as onError and does not retry on its own.
export function createFetchStreamFactory(): StreamFactory {
  return {
    open({ url, token, lastEventId, onEvent, onError }) {
      const controller = new AbortController();

      fetchEventSource(url, {
        signal: controller.signal,
        openWhenHidden: true,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
        },
        async onopen(response) {
          if (response.status === 401) {
            onError(401);
            throw new Error("unauthorized");
          }
          if (!response.ok) {
            onError();
            throw new Error(`stream open failed: ${response.status}`);
          }
        },
        onmessage(ev) {
          onEvent({
            id: ev.id || undefined,
            type: ev.event || "message",
            data: ev.data ? JSON.parse(ev.data) : undefined,
          });
        },
        onclose() {
          // Server closed the stream — hand control back to LiveSync; throwing
          // stops fetch-event-source's own retry loop.
          onError();
          throw new Error("stream closed");
        },
        onerror(err) {
          onError();
          throw err; // stop the library's internal retry; LiveSync reconnects
        },
      }).catch(() => {
        // Swallow the abort/close rejection — onError already fired.
      });

      return { close: () => controller.abort() };
    },
  };
}
