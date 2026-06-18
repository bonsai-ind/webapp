import { describe, expect, test } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "./session";

const BASE = "https://api.test";

describe("Session", () => {
  test("authedFetch attaches the access token minted at login", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/babies`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json([]);
      }),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    const res = await session.authedFetch("/babies");

    expect(res.status).toBe(200);
    expect(seenAuth).toBe("Bearer access-1");
  });

  test("a 401 triggers one refresh and retries the original request", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );

    let refreshCount = 0;
    server.use(
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCount += 1;
        return HttpResponse.json({ access_token: "access-2", refresh_token: "refresh-2" });
      }),
    );

    const retryAuth: string[] = [];
    server.use(
      http.get(`${BASE}/babies`, ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        retryAuth.push(auth);
        if (auth === "Bearer access-1") return new HttpResponse(null, { status: 401 });
        return HttpResponse.json([{ id: "baby_1" }]);
      }),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    const res = await session.authedFetch("/babies");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "baby_1" }]);
    expect(refreshCount).toBe(1);
    expect(retryAuth).toEqual(["Bearer access-1", "Bearer access-2"]);
  });

  test("concurrent 401s share a single refresh", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );

    let refreshCount = 0;
    server.use(
      http.post(`${BASE}/auth/refresh`, async () => {
        refreshCount += 1;
        await delay(20); // hold the refresh open so both requests overlap on it
        return HttpResponse.json({ access_token: "access-2", refresh_token: "refresh-2" });
      }),
    );

    const stale = (request: Request) =>
      request.headers.get("authorization") === "Bearer access-1";
    server.use(
      http.get(`${BASE}/babies`, ({ request }) =>
        stale(request) ? new HttpResponse(null, { status: 401 }) : HttpResponse.json("babies"),
      ),
      http.get(`${BASE}/sleep`, ({ request }) =>
        stale(request) ? new HttpResponse(null, { status: 401 }) : HttpResponse.json("sleep"),
      ),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    const [r1, r2] = await Promise.all([
      session.authedFetch("/babies"),
      session.authedFetch("/sleep"),
    ]);

    expect(refreshCount).toBe(1);
    expect(await r1.json()).toBe("babies");
    expect(await r2.json()).toBe("sleep");
  });

  test("getAccessToken exposes the in-memory token after login (for the SSE connect header)", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );

    const session = createSession({ baseUrl: BASE });
    expect(session.getAccessToken()).toBeNull();

    await session.login("a@example.com", "pw");

    expect(session.getAccessToken()).toBe("access-1");
  });

  test("acceptInvite mints a session: stores tokens, loads identity, authenticates", async () => {
    let acceptBody: unknown;
    server.use(
      http.post(`${BASE}/auth/accept-invite`, async ({ request }) => {
        acceptBody = await request.json();
        return HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" });
      }),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_new", org_role: "caregiver" })),
    );

    const session = createSession({ baseUrl: BASE });
    const states: string[] = [];
    session.onAuthChange((s) => states.push(s.status));

    await session.acceptInvite("invite-tok", "chosen-pw");

    expect(acceptBody).toEqual({ token: "invite-tok", password: "chosen-pw" });
    expect(session.me()).toEqual({ userId: "usr_new", orgRole: "caregiver" });
    expect(localStorage.getItem("hush.refresh_token")).toBe("refresh-1");
    expect(states).toContain("authenticated");
  });

  test("a failed refresh clears tokens and signals logout", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${BASE}/babies`, () => new HttpResponse(null, { status: 401 })),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");

    const states: string[] = [];
    session.onAuthChange((s) => states.push(s.status));

    const res = await session.authedFetch("/babies");

    expect(res.status).toBe(401);
    expect(localStorage.getItem("hush.refresh_token")).toBeNull();
    expect(states).toContain("unauthenticated");
  });

  test("login exposes identity from /me and never persists the access token", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({ user_id: "usr_1", org_id: "org_1", org_role: "caregiver" }),
      ),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");

    expect(session.me()).toEqual({ userId: "usr_1", orgId: "org_1", orgRole: "caregiver" });
    expect(localStorage.getItem("hush.refresh_token")).toBe("refresh-1");
    // Scan every stored value: the access token must never have touched storage.
    const stored = Object.keys(localStorage).map((k) => localStorage.getItem(k));
    expect(stored).not.toContain("access-1");
  });

  test("switchOrg swaps the access token while keeping the refresh token", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1", org_id: "org_1" })),
    );

    let switchBody: unknown;
    let switchAuth: string | null = null;
    server.use(
      http.post(`${BASE}/auth/switch-org`, async ({ request }) => {
        switchBody = await request.json();
        switchAuth = request.headers.get("authorization");
        return HttpResponse.json({ access_token: "access-org2" });
      }),
    );
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/babies`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json([]);
      }),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    await session.switchOrg("org_2");
    await session.authedFetch("/babies");

    expect(seenAuth).toBe("Bearer access-org2");
    expect(switchBody).toEqual({ org_id: "org_2", refresh_token: "refresh-1" });
    // switch-org is a Bearer route — must carry the current access token.
    expect(switchAuth).toBe("Bearer access-1");
    expect(localStorage.getItem("hush.refresh_token")).toBe("refresh-1");
  });

  test("a 403 from switch-org (not a member) leaves the session intact", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1", org_id: "org_1" })),
      http.post(`${BASE}/auth/switch-org`, () => new HttpResponse("forbidden", { status: 403 })),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");

    await expect(session.switchOrg("org_other")).rejects.toBeTruthy();

    // Still signed in as before — a forbidden switch doesn't log you out.
    expect(session.me()).toEqual({ userId: "usr_1", orgId: "org_1" });
    expect(session.getAccessToken()).toBe("access-1");
  });

  test("logout revokes the session and clears tokens", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );

    let logoutBody: unknown;
    let logoutAuth: string | null = null;
    server.use(
      http.post(`${BASE}/auth/logout`, async ({ request }) => {
        logoutBody = await request.json();
        logoutAuth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");

    const states: string[] = [];
    session.onAuthChange((s) => states.push(s.status));

    await session.logout();

    expect(logoutBody).toEqual({ refresh_token: "refresh-1" });
    expect(logoutAuth).toBe("Bearer access-1"); // logout is a Bearer route
    expect(session.me()).toBeNull();
    expect(localStorage.getItem("hush.refresh_token")).toBeNull();
    expect(states).toContain("unauthenticated");
  });

  test("restore rehydrates a reloaded session from the stored refresh token", async () => {
    // Simulate a fresh page load: refresh token already in storage, no access token in memory.
    localStorage.setItem("hush.refresh_token", "refresh-1");
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ access_token: "access-2", refresh_token: "refresh-2" }),
      ),
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({ user_id: "usr_1", org_id: "org_1", org_role: "caregiver" }),
      ),
    );
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/babies`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json([]);
      }),
    );

    const session = createSession({ baseUrl: BASE });
    const states: string[] = [];
    session.onAuthChange((s) => states.push(s.status));

    await session.restore();

    expect(session.me()).toEqual({ userId: "usr_1", orgId: "org_1", orgRole: "caregiver" });
    expect(states).toContain("authenticated");
    await session.authedFetch("/babies");
    expect(seenAuth).toBe("Bearer access-2");
    expect(localStorage.getItem("hush.refresh_token")).toBe("refresh-2");
  });

  test("restore with no stored token leaves the session logged out", async () => {
    const session = createSession({ baseUrl: BASE });
    await session.restore();
    expect(session.me()).toBeNull();
  });

  test("a retried request preserves its method, body, and headers", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ access_token: "access-2", refresh_token: "refresh-2" }),
      ),
    );

    const retried: { method: string; body: unknown; custom: string | null } = {
      method: "",
      body: null,
      custom: null,
    };
    server.use(
      http.post(`${BASE}/devices/dev_1/shares`, async ({ request }) => {
        if (request.headers.get("authorization") === "Bearer access-1") {
          return new HttpResponse(null, { status: 401 });
        }
        retried.method = request.method;
        retried.body = await request.json();
        retried.custom = request.headers.get("x-correlation-id");
        return HttpResponse.json({ ok: true });
      }),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    await session.authedFetch("/devices/dev_1/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Correlation-Id": "abc123" },
      body: JSON.stringify({ email: "nanny@example.com" }),
    });

    expect(retried.method).toBe("POST");
    expect(retried.body).toEqual({ email: "nanny@example.com" });
    expect(retried.custom).toBe("abc123");
  });

  test("switchOrg updates the identity to the new org", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      // The gateway scopes /me to whichever access token is presented.
      http.get(`${BASE}/me`, ({ request }) => {
        const org = request.headers.get("authorization") === "Bearer access-org2" ? "org_2" : "org_1";
        return HttpResponse.json({ user_id: "usr_1", org_id: org, org_role: "owner" });
      }),
      http.post(`${BASE}/auth/switch-org`, () => HttpResponse.json({ access_token: "access-org2" })),
    );

    const session = createSession({ baseUrl: BASE });
    await session.login("a@example.com", "pw");
    expect(session.me()?.orgId).toBe("org_1");

    await session.switchOrg("org_2");
    expect(session.me()?.orgId).toBe("org_2");
  });
});
