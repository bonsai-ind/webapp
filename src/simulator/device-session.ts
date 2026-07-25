// The simulator's device-principal credentials, mirroring src/session/session.ts
// for the *device* token pair (ADR 0010): a short-lived Device Access Token held
// only in memory, plus the rotating opaque Device Token (refresh) persisted
// per-serial so a reloaded simulator is still the same claimed box. Structurally
// satisfies the Session slices the shared helpers need (authedFetch +
// getAccessToken), so getJson / createSignalingChannel / createLiveSync work
// against the device plane unchanged.

export interface DeviceSession {
  getAccessToken(): string | null;
  authedFetch(path: string, init?: RequestInit): Promise<Response>;
  adoptTokens(accessToken: string, refreshToken: string): void;
  restore(): Promise<boolean>;
  refreshToken(): Promise<void>;
  clear(): void;
}

export function createDeviceSession({ baseUrl, serial }: { baseUrl: string; serial: string }): DeviceSession {
  // Keyed by serial — never collides with the user session's hush.refresh_token,
  // so one browser profile can be the caregiver and the device at once.
  const refreshKey = `hush.sim.device_refresh.${serial}`;

  let accessToken: string | null = null;

  const storedRefreshToken = () => localStorage.getItem(refreshKey);

  function adoptTokens(access: string, refresh: string): void {
    accessToken = access;
    localStorage.setItem(refreshKey, refresh);
  }

  function clear(): void {
    accessToken = null;
    localStorage.removeItem(refreshKey);
  }

  // Coalesce concurrent refreshes: the refresh token is single-use (rotation
  // with reuse detection revokes the whole family), so a second concurrent
  // spend must await the in-flight one instead of burning the credential.
  let inFlightRefresh: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (inFlightRefresh) return inFlightRefresh;
    inFlightRefresh = (async () => {
      const stored = storedRefreshToken();
      if (!stored) throw new Error("no device refresh token");
      const res = await fetch(`${baseUrl}/device/token/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: stored }),
      });
      if (!res.ok) {
        // A rejected refresh means the family is revoked or spent — never retry
        // the same secret; the device is back to unclaimed.
        clear();
        throw new Error("device token refresh failed");
      }
      const { access_token, refresh_token } = await res.json();
      adoptTokens(access_token, refresh_token);
    })().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  }

  // Boot-time recovery: true iff a persisted device credential still works.
  async function restore(): Promise<boolean> {
    if (!storedRefreshToken()) return false;
    try {
      await refresh();
      return true;
    } catch {
      return false;
    }
  }

  function send(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await send(path, init);
    if (res.status !== 401) return res;
    try {
      await refresh();
    } catch {
      return res; // credential is dead; surface the original 401
    }
    return send(path, init);
  }

  return {
    getAccessToken: () => accessToken,
    authedFetch,
    adoptTokens,
    restore,
    refreshToken: refresh,
    clear,
  };
}
