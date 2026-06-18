import { describe, expect, test } from "vitest";
import { server } from "../test/server";
import { deviceShareHandlers, type ShareStore } from "./device-share";

const BASE = "https://api.test";

function seedStore(overrides: Partial<ShareStore> = {}): ShareStore {
  return {
    memberships: [{ deviceId: "dev_1", userId: "usr_parent", role: "primary" }],
    tokens: { "access-parent": "usr_parent" },
    ...overrides,
  };
}

function post(path: string, body: unknown, token?: string) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("device-share mock API", () => {
  test("a primary member can issue a share for their device", async () => {
    server.use(...deviceShareHandlers(seedStore()));

    const res = await post("/devices/dev_1/shares", { email: "nanny@example.com" }, "access-parent");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.expires_at).toEqual(expect.any(String));
  });

  test("a guest member cannot issue a share", async () => {
    const store = seedStore({
      memberships: [{ deviceId: "dev_1", userId: "usr_nanny", role: "guest" }],
      tokens: { "access-nanny": "usr_nanny" },
    });
    server.use(...deviceShareHandlers(store));

    const res = await post("/devices/dev_1/shares", { email: "x@example.com" }, "access-nanny");

    expect(res.status).toBe(403);
  });

  test("a non-member cannot issue a share", async () => {
    const store = seedStore({
      memberships: [],
      tokens: { "access-stranger": "usr_stranger" },
    });
    server.use(...deviceShareHandlers(store));

    const res = await post("/devices/dev_1/shares", { email: "x@example.com" }, "access-stranger");

    expect(res.status).toBe(403);
  });

  test("accepting a share grants the new user a guest membership on that device", async () => {
    const store = seedStore();
    server.use(...deviceShareHandlers(store));

    const issued = await (
      await post("/devices/dev_1/shares", { email: "nanny@example.com" }, "access-parent")
    ).json();

    const res = await post("/auth/accept-share", { token: issued.token, password: "pw" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toEqual(expect.any(String));
    expect(body.refresh_token).toEqual(expect.any(String));
    expect(
      store.memberships.some((m) => m.deviceId === "dev_1" && m.role === "guest"),
    ).toBe(true);
  });

  test("reusing a spent share token is rejected", async () => {
    const store = seedStore();
    server.use(...deviceShareHandlers(store));

    const issued = await (
      await post("/devices/dev_1/shares", { email: "nanny@example.com" }, "access-parent")
    ).json();

    await post("/auth/accept-share", { token: issued.token, password: "pw" });
    const reuse = await post("/auth/accept-share", { token: issued.token, password: "pw2" });

    expect(reuse.status).toBe(401);
  });
});
