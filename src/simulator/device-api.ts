import type { DeviceSession } from "./device-session";
import { getJson, postJson, postVoid } from "../api/get-json";

// The simulator's device-plane REST layer — exactly the calls real firmware
// makes (ADR 0010–0013, 0017), nothing else. The request shapes here are the
// firmware contract: device-api.test.ts pins them against the Go DTOs.

export interface RegisterResult {
  deviceId: string;
  status: string;
  pairingCode?: string;
  expiresAt?: string;
}

// The box's first contact — open route (no auth), so plain fetch, not a session.
export async function registerDevice(
  baseUrl: string,
  { serialNumber, model, firmwareVersion }: { serialNumber: string; model: string; firmwareVersion: string },
): Promise<RegisterResult> {
  const res = await fetch(`${baseUrl}/devices/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serial_number: serialNumber,
      model,
      firmware_version: firmwareVersion,
    }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status}`);
  const dto = await res.json();
  return {
    deviceId: dto.device_id,
    status: dto.status,
    pairingCode: dto.pairing_code,
    expiresAt: dto.expires_at,
  };
}

export interface DeviceSelf {
  id: string;
  name: string;
  babyId: string | null;
  status: string;
}

export async function getDeviceSelf(ds: DeviceSession): Promise<DeviceSelf> {
  const dto = await getJson<{ id: string; name: string; baby_id: string | null; status: string }>(
    ds,
    "/device/me",
  );
  return { id: dto.id, name: dto.name, babyId: dto.baby_id, status: dto.status };
}

export interface CryReport {
  episodeId: string;
  state: "crying" | "calm";
  cryType: string;
  confidence: number;
  modelVersion: string;
  audioDurationSeconds: number;
}

export async function reportCry(ds: DeviceSession, report: CryReport): Promise<void> {
  await postJson(ds, "/device/cry", report);
}

export interface PositionReport {
  episodeId: string;
  state: "alert" | "clear";
  posture: "face_up" | "face_down_or_absent" | "occluded" | "unknown";
  faceVisible: boolean;
  confidence: number;
  modelVersion: string;
}

export async function reportPosition(ds: DeviceSession, report: PositionReport): Promise<void> {
  await postJson(ds, "/device/position", report);
}

export interface SleepReport {
  episodeId: string;
  kind: "night" | "nap";
  startedAt: string;
  endedAt?: string;
  wakings: number;
}

export async function reportSleep(ds: DeviceSession, report: SleepReport): Promise<void> {
  await postJson(ds, "/device/sleep", report);
}

export interface FeedingReport {
  episodeId: string;
  method: "bottle" | "breast";
  startedAt: string;
  endedAt?: string;
  volumeMl?: number;
  durationSeconds?: number;
}

export async function reportFeeding(ds: DeviceSession, report: FeedingReport): Promise<void> {
  await postJson(ds, "/device/feeding", report);
}

export async function reportCameraStatus(
  ds: DeviceSession,
  status: { available: boolean; source: "camera" | "demo" | "none" },
): Promise<void> {
  await postVoid(ds, "/device/camera-status", status);
}

export interface HeartbeatVitals {
  cpu: number;
  memory: number;
  storage: number;
  network: string;
  version: string;
}

export async function sendHeartbeat(ds: DeviceSession, vitals: HeartbeatVitals): Promise<void> {
  await postVoid(ds, "/device/heartbeat", vitals);
}

// Device-plane TURN (ADR 0013): same coturn REST shape as the user endpoint,
// but authenticated as the box. Entries with no urls are dropped — the local
// stack ships no TURN and RTCPeerConnection rejects empty urls.
export async function fetchDeviceTurnConfig(ds: DeviceSession): Promise<RTCConfiguration> {
  const c = await getJson<{ urls: string[]; username: string; credential: string }>(
    ds,
    "/device/turn-credentials",
  );
  const iceServers: RTCIceServer[] = [];
  if (c.urls?.length) iceServers.push({ urls: c.urls, username: c.username, credential: c.credential });
  return { iceServers };
}

// One continuous temperature reading (heartbeat pattern; never alerts alone).
export async function reportTemperature(
  ds: DeviceSession,
  reading: { sensor: "room" | "body"; celsius: number },
): Promise<void> {
  await postVoid(ds, "/device/temperature", reading);
}

export interface TemperatureAlertReport {
  episodeId: string;
  sensor: "room" | "body";
  kind: string;
  state: "alert" | "clear";
  celsius: number;
}

// Open/close a device-detected temperature anomaly episode (the device owns
// the thresholds — see temperature-rules.ts, the firmware contract).
export async function reportTemperatureAlert(ds: DeviceSession, report: TemperatureAlertReport): Promise<void> {
  await postJson(ds, "/device/temperature-alert", report);
}

export interface DistressAlertReport {
  episodeId: string;
  state: "alert" | "clear";
  level: "fussing" | "stress" | "distress" | "emergency";
  cues: string[];
  confidence: number;
  modelVersion: string;
}

// Open/close a device-detected behavioral-distress episode (the device owns the
// posture + facial micro-expression fusion — see distress-rules.ts, the
// firmware contract).
export async function reportDistressAlert(ds: DeviceSession, report: DistressAlertReport): Promise<void> {
  await postJson(ds, "/device/distress-alert", report);
}

export interface GrowthMeasurementReport {
  weightKg?: number;
  lengthCm?: number;
  headCircumferenceCm?: number;
  takenAt?: string;
}

// A connected smart-scale reading (device-reported growth measurement). Real
// hardware (Withings/Hatch-style) reports the same shape; the app plots it.
export async function reportGrowthMeasurement(ds: DeviceSession, report: GrowthMeasurementReport): Promise<void> {
  await postJson(ds, "/device/growth", report);
}

// Device-initiated call (this project's one backend addition): ask the backend
// to ring every member of this device. callId is the device-minted dedup key.
// An optional reason marks an automatic escalation (e.g. "face may be covered")
// so the viewer's ring can distinguish it from a manual call.
export async function requestCall(ds: DeviceSession, callId: string, reason?: string): Promise<void> {
  await postVoid(ds, "/device/call/request", reason ? { callId, reason } : { callId });
}
