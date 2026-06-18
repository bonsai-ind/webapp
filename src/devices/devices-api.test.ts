import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { claimDevice, getDevice, listDevices, shareDevice } from "./devices-api";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });

// Shapes mirror the real backend (verified against :8080).
describe("devices API", () => {
  test("claimDevice posts the name and returns the camelCased device", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/devices`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: "dev_1",
          name: "Nursery Cam",
          baby_id: null,
          created_at: "2026-06-13T19:00:00Z",
        });
      }),
    );

    const device = await claimDevice(session(), "Nursery Cam");

    expect(body).toEqual({ name: "Nursery Cam" });
    expect(device).toEqual({
      id: "dev_1",
      name: "Nursery Cam",
      babyId: null,
      createdAt: "2026-06-13T19:00:00Z",
    });
  });

  test("listDevices returns the caller's devices (camelCased)", async () => {
    server.use(
      http.get(`${BASE}/devices`, () =>
        HttpResponse.json([
          { id: "dev_1", name: "Nursery Cam", baby_id: "baby_9", created_at: "2026-06-13T19:00:00Z" },
        ]),
      ),
    );

    const devices = await listDevices(session());

    expect(devices).toEqual([
      { id: "dev_1", name: "Nursery Cam", babyId: "baby_9", createdAt: "2026-06-13T19:00:00Z" },
    ]);
  });

  test("getDevice returns the camelCased device", async () => {
    server.use(
      http.get(`${BASE}/devices/dev_1`, () =>
        HttpResponse.json({ id: "dev_1", name: "Nursery Cam", baby_id: "baby_9", created_at: "2026-06-13T19:00:00Z" }),
      ),
    );

    const device = await getDevice(session(), "dev_1");

    expect(device).toEqual({
      id: "dev_1",
      name: "Nursery Cam",
      babyId: "baby_9",
      createdAt: "2026-06-13T19:00:00Z",
    });
  });

  test("shareDevice posts the email and returns the share token + expiry", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/devices/dev_1/shares`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ token: "SHARE_TOK", expires_at: "2026-06-16T19:00:00Z" });
      }),
    );

    const share = await shareDevice(session(), "dev_1", "nanny@example.com");

    expect(body).toEqual({ email: "nanny@example.com" });
    expect(share).toEqual({ token: "SHARE_TOK", expiresAt: "2026-06-16T19:00:00Z" });
  });
});
