export type DeviceRole = "primary" | "guest";

export interface DeviceMembership {
  deviceId: string;
  role: DeviceRole;
}

export interface DeviceAccess {
  canView(deviceId: string): boolean;
  canTalk(deviceId: string): boolean;
  canManage(deviceId: string): boolean;
  canShare(deviceId: string): boolean;
}

export function deviceAccess(memberships: DeviceMembership[]): DeviceAccess {
  function hasRole(deviceId: string, role: DeviceRole): boolean {
    return memberships.some((m) => m.deviceId === deviceId && m.role === role);
  }

  function canView(deviceId: string): boolean {
    return memberships.some((m) => m.deviceId === deviceId);
  }

  function isPrimary(deviceId: string): boolean {
    return hasRole(deviceId, "primary");
  }

  return {
    canView,
    canTalk: canView, // both roles monitor + talk
    canManage: isPrimary, // primary (parent) only
    canShare: isPrimary, // primary (parent) only
  };
}
