import type { Session } from "../session/session";
import { getJson, postJson, postVoid, deleteJson } from "../api/get-json";

export interface Device {
  id: string;
  name: string;
  babyId: string | null;
  createdAt: string;
  // Heartbeat-derived online/offline (ADR 0012) — used to prefer the live box
  // when more than one device is paired to the same baby.
  liveness?: "online" | "offline";
  // Device-reported physical-camera presence (ADR 0010); false → offer Simulate Camera.
  cameraAvailable?: boolean;
}

export interface DeviceShare {
  token: string;
  expiresAt: string;
}

export interface DeviceShareEntry {
  id: string;
  email: string;
  expiresAt: string;
  accepted: boolean;
}

// Backend device shape (snake_case) → our camelCase Device.
interface DeviceDto {
  id: string;
  name: string;
  baby_id: string | null;
  created_at: string;
  liveness?: "online" | "offline";
  cameraAvailable?: boolean;
}

const toDevice = (d: DeviceDto): Device => ({
  id: d.id,
  name: d.name,
  babyId: d.baby_id,
  createdAt: d.created_at,
  liveness: d.liveness,
  cameraAvailable: d.cameraAvailable,
});

export interface ClaimedDevice {
  device: Device;
  // The freshly-minted device credential pair (ADR 0010) — returned once, to
  // the claiming client. The simulator adopts these to authenticate as the box.
  accessToken: string;
  refreshToken: string;
}

// Redeem the Pairing Code shown on the device screen (ADR 0010): attaches the
// caller as Primary, activates the device, and returns its token pair.
export async function claimDevice(
  session: Session,
  { pairingCode, name }: { pairingCode: string; name: string },
): Promise<ClaimedDevice> {
  const dto = await postJson<DeviceDto & { access_token: string; refresh_token: string }>(
    session,
    "/devices",
    { pairing_code: pairingCode, name },
  );
  return { device: toDevice(dto), accessToken: dto.access_token, refreshToken: dto.refresh_token };
}

export async function getDevice(session: Session, id: string): Promise<Device> {
  return toDevice(await getJson<DeviceDto>(session, `/devices/${id}`));
}

export async function listDevices(session: Session): Promise<Device[]> {
  return (await getJson<DeviceDto[]>(session, "/devices")).map(toDevice);
}

export async function pairDevice(
  session: Session,
  deviceId: string,
  babyId: string,
): Promise<Device> {
  return toDevice(
    await postJson<DeviceDto>(session, `/devices/${deviceId}/pair`, { baby_id: babyId }),
  );
}

export async function shareDevice(
  session: Session,
  id: string,
  email: string,
): Promise<DeviceShare> {
  const res = await postJson<{ token: string; expires_at: string }>(
    session,
    `/devices/${id}/shares`,
    { email },
  );
  return { token: res.token, expiresAt: res.expires_at };
}

export async function listShares(
  session: Session,
  deviceId: string,
): Promise<DeviceShareEntry[]> {
  const items = await getJson<
    Array<{ id: string; email: string; expires_at: string; accepted: boolean }>
  >(session, `/devices/${deviceId}/shares`);
  return items.map((s) => ({ id: s.id, email: s.email, expiresAt: s.expires_at, accepted: s.accepted }));
}

export async function revokeShare(
  session: Session,
  deviceId: string,
  userId: string,
): Promise<void> {
  await deleteJson(session, `/devices/${deviceId}/shares/${userId}`);
}

export async function wakeDevice(session: Session, deviceId: string): Promise<void> {
  await postVoid(session, `/devices/${deviceId}/call/start`);
}

// simulateCamera asks a device with no physical camera to start its demo feed
// (Simulate Camera, ADR 0010) — the device switches to the bundled demo source.
export async function simulateCamera(session: Session, deviceId: string): Promise<void> {
  await postVoid(session, `/devices/${deviceId}/demo/start`);
}
