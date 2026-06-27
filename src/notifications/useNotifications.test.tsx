import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "../test/server";
import { QueryWrapper } from "../test/query";
import { createSession } from "../session/session";
import { useUnreadCount, useNotifications, useMarkRead } from "./useNotifications";

const BASE = "https://api.test";

describe("useUnreadCount", () => {
  // C1 tracer: the bell badge count comes from the unread-count endpoint.
  test("reports the caller's unread count", async () => {
    server.use(
      http.get(`${BASE}/notifications/unread-count`, () =>
        HttpResponse.json({ unread: 3 }),
      ),
    );
    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useUnreadCount(session), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unread).toBe(3);
  });
});

describe("useNotifications", () => {
  // C2: the history feed comes from the list endpoint, newest-first; a cursor
  // means there is an older page.
  test("loads the notification history and reports there's more", async () => {
    server.use(
      http.get(`${BASE}/notifications`, () =>
        HttpResponse.json({
          items: [
            { id: "ntf_2", type: "cry", title: "Mia is crying", body: "Likely hunger", read: false, createdAt: "2026-01-01T00:02:00Z" },
            { id: "ntf_1", type: "cry", title: "Mia is crying", body: "Likely tired", read: true, createdAt: "2026-01-01T00:01:00Z" },
          ],
          nextCursor: "cur_abc",
        }),
      ),
    );
    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useNotifications(session), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications.map((n) => n.id)).toEqual(["ntf_2", "ntf_1"]);
    expect(result.current.hasNextPage).toBe(true);
  });

  // Slice 5: fetching the next page follows the cursor and appends older items.
  test("fetchNextPage follows the cursor and appends the older page", async () => {
    server.use(
      http.get(`${BASE}/notifications`, ({ request }) => {
        const before = new URL(request.url).searchParams.get("before");
        if (!before) {
          return HttpResponse.json({
            items: [{ id: "ntf_3", type: "cry", title: "newest", body: "", read: false, createdAt: "2026-01-01T00:03:00Z" }],
            nextCursor: "cur_1",
          });
        }
        return HttpResponse.json({
          items: [{ id: "ntf_2", type: "cry", title: "older", body: "", read: true, createdAt: "2026-01-01T00:02:00Z" }],
          nextCursor: "",
        });
      }),
    );
    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useNotifications(session), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications.map((n) => n.id)).toEqual(["ntf_3"]);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.notifications.map((n) => n.id)).toEqual(["ntf_3", "ntf_2"]));
    expect(result.current.hasNextPage).toBe(false);
  });

  test("surfaces an error state when the request fails", async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => new HttpResponse(null, { status: 500 })),
    );
    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useNotifications(session), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useMarkRead", () => {
  // C3: marking read posts to the per-notification read endpoint.
  test("posts to mark a notification read", async () => {
    let hit = "";
    server.use(
      http.post(`${BASE}/notifications/:id/read`, ({ params }) => {
        hit = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useMarkRead(session), { wrapper: QueryWrapper });

    await result.current.mutateAsync("ntf_42");
    expect(hit).toBe("ntf_42");
  });
});
