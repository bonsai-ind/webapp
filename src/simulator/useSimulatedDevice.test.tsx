import { beforeEach, describe, expect, test } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { createDeviceSession } from "./device-session";
import { useSimulatedDevice } from "./useSimulatedDevice";

const BASE = "https://api.test";

beforeEach(() => localStorage.clear());

function mount(deviceSession = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" })) {
  const session = createSession({ baseUrl: BASE });
  return renderHook(() =>
    useSimulatedDevice({ session, deviceSession, baseUrl: BASE, serial: "SIM-TEST" }),
  );
}

describe("useSimulatedDevice", () => {
  test("fresh boot registers by serial and shows the pairing code", async () => {
    let registerBody: unknown;
    server.use(
      http.post(`${BASE}/devices/register`, async ({ request }) => {
        registerBody = await request.json();
        return HttpResponse.json({
          device_id: "dev_1",
          status: "inactive",
          pairing_code: "ABCD2345",
          expires_at: "2026-07-25T10:00:00Z",
        });
      }),
    );

    const { result } = mount();

    await waitFor(() => expect(result.current.state.phase).toBe("unclaimed"));
    expect(registerBody).toEqual({
      serial_number: "SIM-TEST",
      model: "HUSH SIM",
      firmware_version: "sim-1.0.0",
    });
    expect(result.current.state.pairingCode).toBe("ABCD2345");
    expect(result.current.state.deviceId).toBe("dev_1");
  });

  test("claim adopts the device tokens and goes active", async () => {
    server.use(
      http.post(`${BASE}/devices/register`, () =>
        HttpResponse.json({ device_id: "dev_1", status: "inactive", pairing_code: "ABCD2345", expires_at: "2026-07-25T10:00:00Z" }),
      ),
      http.post(`${BASE}/devices`, async ({ request }) => {
        const body = (await request.json()) as Record<string, string>;
        expect(body.pairing_code).toBe("ABCD2345");
        return HttpResponse.json({
          id: "dev_1",
          name: body.name,
          baby_id: null,
          created_at: "2026-07-25T09:00:00Z",
          access_token: "dev-acc",
          refresh_token: "dev-ref",
        });
      }),
    );

    const deviceSession = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });
    const { result } = mount(deviceSession);
    await waitFor(() => expect(result.current.state.phase).toBe("unclaimed"));

    await act(() => result.current.claim("Sim Cam"));

    expect(result.current.state.phase).toBe("active");
    expect(result.current.state.deviceName).toBe("Sim Cam");
    expect(deviceSession.getAccessToken()).toBe("dev-acc");
    expect(localStorage.getItem("hush.sim.device_refresh.SIM-TEST")).toBe("dev-ref");
  });

  test("boot with a live persisted credential restores straight to active", async () => {
    localStorage.setItem("hush.sim.device_refresh.SIM-TEST", "ref-1");
    server.use(
      http.post(`${BASE}/device/token/refresh`, () =>
        HttpResponse.json({ access_token: "acc-2", refresh_token: "ref-2" }),
      ),
      http.get(`${BASE}/device/me`, () =>
        HttpResponse.json({ id: "dev_1", name: "Sim Cam", baby_id: "bby_1", status: "active" }),
      ),
    );

    const { result } = mount();

    await waitFor(() => expect(result.current.state.phase).toBe("active"));
    expect(result.current.state).toMatchObject({ deviceId: "dev_1", deviceName: "Sim Cam", babyId: "bby_1" });
  });

  test("a dead persisted credential falls back to fresh registration", async () => {
    localStorage.setItem("hush.sim.device_refresh.SIM-TEST", "ref-dead");
    server.use(
      http.post(`${BASE}/device/token/refresh`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/devices/register`, () =>
        HttpResponse.json({ device_id: "dev_2", status: "inactive", pairing_code: "EFGH6789", expires_at: "2026-07-25T10:00:00Z" }),
      ),
    );

    const { result } = mount();

    await waitFor(() => expect(result.current.state.phase).toBe("unclaimed"));
    expect(result.current.state.pairingCode).toBe("EFGH6789");
  });

  test("pairBaby posts to the user-plane pair route and records the baby", async () => {
    server.use(
      http.post(`${BASE}/devices/register`, () =>
        HttpResponse.json({ device_id: "dev_1", status: "inactive", pairing_code: "ABCD2345", expires_at: "2026-07-25T10:00:00Z" }),
      ),
      http.post(`${BASE}/devices`, () =>
        HttpResponse.json({ id: "dev_1", name: "Sim Cam", baby_id: null, created_at: "2026-07-25T09:00:00Z", access_token: "a", refresh_token: "r" }),
      ),
      http.post(`${BASE}/devices/dev_1/pair`, async ({ request }) => {
        expect(await request.json()).toEqual({ baby_id: "bby_2" });
        return HttpResponse.json({ id: "dev_1", name: "Sim Cam", baby_id: "bby_2", created_at: "2026-07-25T09:00:00Z" });
      }),
    );

    const { result } = mount();
    await waitFor(() => expect(result.current.state.phase).toBe("unclaimed"));
    await act(() => result.current.claim("Sim Cam"));

    await act(() => result.current.pairBaby("bby_2"));

    expect(result.current.state.babyId).toBe("bby_2");
  });
});
