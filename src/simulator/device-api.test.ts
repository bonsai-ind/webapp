import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createDeviceSession } from "./device-session";
import {
  fetchDeviceTurnConfig,
  getDeviceSelf,
  registerDevice,
  reportCameraStatus,
  reportCry,
  reportFeeding,
  reportDistressAlert,
  reportPosition,
  reportSleep,
  reportTemperature,
  reportTemperatureAlert,
  requestCall,
  sendHeartbeat,
} from "./device-api";

const BASE = "https://api.test";

// These request bodies ARE the firmware contract: they pin the exact JSON the
// Go DTOs in backend/services/device-service/messages decode (which use
// DisallowUnknownFields). Real firmware must send the same shapes.
function ds() {
  const s = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });
  s.adoptTokens("acc", "ref");
  return s;
}

function capture(method: "post" | "get", path: string, response: unknown = null, status = 204) {
  const captured: { body?: unknown; auth?: string | null } = {};
  server.use(
    http[method](`${BASE}${path}`, async ({ request }) => {
      captured.auth = request.headers.get("Authorization");
      if (method === "post") captured.body = await request.json();
      return response === null ? new HttpResponse(null, { status }) : HttpResponse.json(response);
    }),
  );
  return captured;
}

describe("simulator device API (firmware contract)", () => {
  test("registerDevice posts snake_case hardware identity, unauthenticated", async () => {
    const captured = capture("post", "/devices/register", {
      device_id: "dev_1",
      status: "inactive",
      pairing_code: "ABCD2345",
      expires_at: "2026-07-25T10:00:00Z",
    });

    const result = await registerDevice(BASE, {
      serialNumber: "SIM-TEST",
      model: "HUSH SIM",
      firmwareVersion: "sim-1.0.0",
    });

    expect(captured.body).toEqual({
      serial_number: "SIM-TEST",
      model: "HUSH SIM",
      firmware_version: "sim-1.0.0",
    });
    expect(captured.auth).toBeNull();
    expect(result).toEqual({
      deviceId: "dev_1",
      status: "inactive",
      pairingCode: "ABCD2345",
      expiresAt: "2026-07-25T10:00:00Z",
    });
  });

  test("getDeviceSelf reads /device/me with the device token", async () => {
    const captured = capture("get", "/device/me", {
      id: "dev_1",
      name: "Sim Cam",
      baby_id: "bby_1",
      status: "active",
    });

    const self = await getDeviceSelf(ds());

    expect(captured.auth).toBe("Bearer acc");
    expect(self).toEqual({ id: "dev_1", name: "Sim Cam", babyId: "bby_1", status: "active" });
  });

  test("reportCry posts the CryReportRequest shape", async () => {
    const captured = capture("post", "/device/cry", { episodeId: "ep_1", alerted: true });

    await reportCry(ds(), {
      episodeId: "ep_1",
      state: "crying",
      cryType: "hungry",
      confidence: 0.93,
      modelVersion: "sim",
      audioDurationSeconds: 4.2,
    });

    expect(captured.body).toEqual({
      episodeId: "ep_1",
      state: "crying",
      cryType: "hungry",
      confidence: 0.93,
      modelVersion: "sim",
      audioDurationSeconds: 4.2,
    });
  });

  test("reportPosition posts the PositionReportRequest shape", async () => {
    const captured = capture("post", "/device/position", { episodeId: "ep_2", alerted: true });

    await reportPosition(ds(), {
      episodeId: "ep_2",
      state: "alert",
      posture: "face_down_or_absent",
      faceVisible: false,
      confidence: 0.88,
      modelVersion: "sim",
    });

    expect(captured.body).toEqual({
      episodeId: "ep_2",
      state: "alert",
      posture: "face_down_or_absent",
      faceVisible: false,
      confidence: 0.88,
      modelVersion: "sim",
    });
  });

  test("reportSleep posts the ReportSleepRequest shape", async () => {
    const captured = capture("post", "/device/sleep", { episodeId: "ep_3" });

    await reportSleep(ds(), {
      episodeId: "ep_3",
      kind: "nap",
      startedAt: "2026-07-25T09:00:00Z",
      endedAt: "2026-07-25T10:00:00Z",
      wakings: 1,
    });

    expect(captured.body).toEqual({
      episodeId: "ep_3",
      kind: "nap",
      startedAt: "2026-07-25T09:00:00Z",
      endedAt: "2026-07-25T10:00:00Z",
      wakings: 1,
    });
  });

  test("reportFeeding posts the ReportFeedingRequest shape (bottle)", async () => {
    const captured = capture("post", "/device/feeding", { episodeId: "ep_4" });

    await reportFeeding(ds(), {
      episodeId: "ep_4",
      method: "bottle",
      startedAt: "2026-07-25T08:00:00Z",
      volumeMl: 120,
    });

    expect(captured.body).toEqual({
      episodeId: "ep_4",
      method: "bottle",
      startedAt: "2026-07-25T08:00:00Z",
      volumeMl: 120,
    });
  });

  test("reportCameraStatus posts the CameraStatusRequest shape", async () => {
    const captured = capture("post", "/device/camera-status");

    await reportCameraStatus(ds(), { available: true, source: "camera" });

    expect(captured.body).toEqual({ available: true, source: "camera" });
  });

  test("sendHeartbeat posts the HeartbeatRequest vitals", async () => {
    const captured = capture("post", "/device/heartbeat");

    await sendHeartbeat(ds(), { cpu: 0.4, memory: 0.5, storage: 0.2, network: "wifi", version: "sim-1.0.0" });

    expect(captured.body).toEqual({ cpu: 0.4, memory: 0.5, storage: 0.2, network: "wifi", version: "sim-1.0.0" });
  });

  test("fetchDeviceTurnConfig drops empty-url entries (local stack has no TURN)", async () => {
    capture("get", "/device/turn-credentials", { urls: [], username: "", credential: "", ttl: 600 });

    expect(await fetchDeviceTurnConfig(ds())).toEqual({ iceServers: [] });
  });

  test("fetchDeviceTurnConfig shapes coturn credentials into iceServers", async () => {
    capture("get", "/device/turn-credentials", {
      urls: ["turn:turn.example:3478"],
      username: "u",
      credential: "c",
      ttl: 600,
    });

    expect(await fetchDeviceTurnConfig(ds())).toEqual({
      iceServers: [{ urls: ["turn:turn.example:3478"], username: "u", credential: "c" }],
    });
  });

  test("reportTemperature posts the sample shape", async () => {
    const captured = capture("post", "/device/temperature");

    await reportTemperature(ds(), { sensor: "room", celsius: 21.4 });

    expect(captured.body).toEqual({ sensor: "room", celsius: 21.4 });
  });

  test("reportTemperatureAlert posts the anomaly episode shape", async () => {
    const captured = capture("post", "/device/temperature-alert", { episodeId: "tep_1", alerted: true });

    await reportTemperatureAlert(ds(), {
      episodeId: "tep_1",
      sensor: "room",
      kind: "too_hot",
      state: "alert",
      celsius: 24.1,
    });

    expect(captured.body).toEqual({
      episodeId: "tep_1",
      sensor: "room",
      kind: "too_hot",
      state: "alert",
      celsius: 24.1,
    });
  });

  test("reportDistressAlert posts the distress episode shape", async () => {
    const captured = capture("post", "/device/distress-alert", { episodeId: "dep_1", alerted: true });

    await reportDistressAlert(ds(), {
      episodeId: "dep_1",
      state: "alert",
      level: "distress",
      cues: ["brow_bulge", "eye_squeeze", "legs_to_chest"],
      confidence: 0.85,
      modelVersion: "sim",
    });

    expect(captured.body).toEqual({
      episodeId: "dep_1",
      state: "alert",
      level: "distress",
      cues: ["brow_bulge", "eye_squeeze", "legs_to_chest"],
      confidence: 0.85,
      modelVersion: "sim",
    });
  });

  test("requestCall posts the device-minted callId", async () => {
    const captured = capture("post", "/device/call/request");

    await requestCall(ds(), "call_sim_1");

    expect(captured.body).toEqual({ callId: "call_sim_1" });
  });

  test("requestCall includes an auto-call reason when given", async () => {
    const captured = capture("post", "/device/call/request");

    await requestCall(ds(), "call_sim_2", "face may be covered");

    expect(captured.body).toEqual({ callId: "call_sim_2", reason: "face may be covered" });
  });
});
