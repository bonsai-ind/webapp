import { beforeEach, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createDeviceSession } from "./device-session";

const BASE = "https://api.test";
const KEY = "hush.sim.device_refresh.SIM-TEST";

beforeEach(() => localStorage.clear());

function session() {
  return createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });
}

describe("createDeviceSession", () => {
  test("adoptTokens attaches the access token and persists the refresh per-serial", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/device/me`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ id: "dev_1" });
      }),
    );

    const ds = session();
    ds.adoptTokens("acc-1", "ref-1");
    await ds.authedFetch("/device/me");

    expect(auth).toBe("Bearer acc-1");
    expect(localStorage.getItem(KEY)).toBe("ref-1");
  });

  test("401 → refresh → retry once with the new token", async () => {
    const auths: (string | null)[] = [];
    server.use(
      http.get(`${BASE}/device/me`, ({ request }) => {
        auths.push(request.headers.get("Authorization"));
        return auths.length === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ id: "dev_1" });
      }),
      http.post(`${BASE}/device/token/refresh`, async ({ request }) => {
        const body = (await request.json()) as { refresh_token: string };
        expect(body.refresh_token).toBe("ref-1");
        return HttpResponse.json({ access_token: "acc-2", refresh_token: "ref-2" });
      }),
    );

    const ds = session();
    ds.adoptTokens("acc-1", "ref-1");
    const res = await ds.authedFetch("/device/me");

    expect(res.ok).toBe(true);
    expect(auths).toEqual(["Bearer acc-1", "Bearer acc-2"]);
    expect(localStorage.getItem(KEY)).toBe("ref-2");
  });

  test("failed refresh clears storage and surfaces the original 401", async () => {
    server.use(
      http.get(`${BASE}/device/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/device/token/refresh`, () => new HttpResponse(null, { status: 401 })),
    );

    const ds = session();
    ds.adoptTokens("acc-1", "ref-1");
    const res = await ds.authedFetch("/device/me");

    expect(res.status).toBe(401);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  test("concurrent refreshes coalesce into one spend of the refresh token", async () => {
    let refreshCalls = 0;
    server.use(
      http.post(`${BASE}/device/token/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ access_token: "acc-2", refresh_token: "ref-2" });
      }),
    );

    const ds = session();
    ds.adoptTokens("acc-1", "ref-1");
    await Promise.all([ds.refreshToken(), ds.refreshToken()]);

    expect(refreshCalls).toBe(1);
  });

  test("restore succeeds from a persisted refresh token", async () => {
    server.use(
      http.post(`${BASE}/device/token/refresh`, () =>
        HttpResponse.json({ access_token: "acc-9", refresh_token: "ref-9" }),
      ),
    );
    localStorage.setItem(KEY, "ref-8");

    const ds = session();
    expect(await ds.restore()).toBe(true);
    expect(ds.getAccessToken()).toBe("acc-9");
  });

  test("restore is false with no stored credential", async () => {
    expect(await session().restore()).toBe(false);
  });
});
