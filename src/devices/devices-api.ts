import type { Session } from "../session/session";
import { getJson, postJson, postVoid, deleteJson } from "../api/get-json";

export interface Device {
  id: string;
  name: string;
  babyId: string | null;
  createdAt: string;
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
}

const toDevice = (d: DeviceDto): Device => ({
  id: d.id,
  name: d.name,
  babyId: d.baby_id,
  createdAt: d.created_at,
});

export async function claimDevice(
  session: Session,
  pairingCode: string,
  name: string,
): Promise<Device> {
  return toDevice(
    await postJson<DeviceDto>(session, "/devices", { pairing_code: pairingCode, name }),
  );
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
