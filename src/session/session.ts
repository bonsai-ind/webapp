export interface Identity {
  userId: string;
  platformRole?: string;
  orgId?: string;
  orgRole?: string;
}

export interface AuthState {
  status: "authenticated" | "unauthenticated";
  identity?: Identity;
}

export interface Session {
  login(email: string, password: string): Promise<void>;
  acceptInvite(token: string, password: string): Promise<void>;
  restore(): Promise<void>;
  me(): Identity | null;
  getAccessToken(): string | null;
  switchOrg(orgId: string): Promise<void>;
  logout(): Promise<void>;
  authedFetch(path: string, init?: RequestInit): Promise<Response>;
  onAuthChange(listener: (state: AuthState) => void): () => void;
  refreshToken(): Promise<void>;
}

export interface SessionConfig {
  baseUrl: string;
}

const REFRESH_KEY = "hush.refresh_token";

export function createSession(config: SessionConfig): Session {
  // Access token lives only in this closure variable — never in storage.
  let accessToken: string | null = null;
  let identity: Identity | null = null;

  function toIdentity(claims: Record<string, string>): Identity {
    return {
      userId: claims.user_id,
      platformRole: claims.platform_role,
      orgId: claims.org_id,
      orgRole: claims.org_role,
    };
  }

  const listeners = new Set<(state: AuthState) => void>();
  function emit(state: AuthState): void {
    for (const listener of listeners) listener(state);
  }

  function onAuthChange(listener: (state: AuthState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function clearSession(): void {
    accessToken = null;
    identity = null;
    localStorage.removeItem(REFRESH_KEY);
    emit({ status: "unauthenticated" });
  }

  function postJson(path: string, body: unknown): Promise<Response> {
    return fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const storedRefreshToken = () => localStorage.getItem(REFRESH_KEY);

  async function loadIdentity(): Promise<Identity> {
    const meRes = await fetch(`${config.baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    identity = toIdentity(await meRes.json());
    return identity;
  }

  // Once we hold a valid access token, fetch identity and announce the session.
  async function becomeAuthenticated(): Promise<void> {
    emit({ status: "authenticated", identity: await loadIdentity() });
  }

  // Store a freshly-minted token pair and announce the session. Shared by the
  // two session-minting flows: login and accept-invite.
  async function startSession(res: Response): Promise<void> {
    const { access_token, refresh_token } = await res.json();
    accessToken = access_token;
    localStorage.setItem(REFRESH_KEY, refresh_token);
    await becomeAuthenticated();
  }

  async function login(email: string, password: string): Promise<void> {
    await startSession(await postJson("/auth/login", { email, password }));
  }

  async function acceptInvite(token: string, password: string): Promise<void> {
    await startSession(await postJson("/auth/accept-invite", { token, password }));
  }

  // Called once on app boot. The access token never survives a reload (it lives
  // only in memory), so recover it from the rotating refresh token in storage.
  async function restore(): Promise<void> {
    if (!storedRefreshToken()) return; // no prior session — stay unauthenticated
    try {
      await refresh();
      await becomeAuthenticated();
    } catch {
      clearSession();
    }
  }

  function me(): Identity | null {
    return identity;
  }

  function getAccessToken(): string | null {
    return accessToken;
  }

  // switch-org and logout are Bearer routes — go through authedFetch so the
  // current access token rides along (postJson is for the public auth endpoints).
  function authedPost(path: string, body: unknown): Promise<Response> {
    return authedFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function switchOrg(orgId: string): Promise<void> {
    const res = await authedPost("/auth/switch-org", {
      org_id: orgId,
      refresh_token: storedRefreshToken(),
    });
    const { access_token } = await res.json();
    accessToken = access_token;
    await becomeAuthenticated();
  }

  async function logout(): Promise<void> {
    await authedPost("/auth/logout", { refresh_token: storedRefreshToken() });
    clearSession();
  }

  // Coalesce concurrent refreshes: callers that 401 while a refresh is already
  // in flight await the same promise instead of spending the refresh token twice
  // (a second spend would trip server-side reuse detection and revoke the family).
  let inFlightRefresh: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (inFlightRefresh) return inFlightRefresh;
    inFlightRefresh = (async () => {
      const res = await postJson("/auth/refresh", { refresh_token: storedRefreshToken() });
      if (!res.ok) throw new Error("refresh failed");
      const { access_token, refresh_token } = await res.json();
      accessToken = access_token;
      localStorage.setItem(REFRESH_KEY, refresh_token);
    })().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  }

  // Exposed on the Session interface so external callers (e.g. main.tsx wiring
  // up LiveSync's onAuthError) can trigger a token refresh without going through
  // authedFetch. Coalescing is inherited from the internal refresh() function.
  function refreshToken(): Promise<void> {
    return refresh();
  }

  function send(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${config.baseUrl}${path}`, {
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
      clearSession();
      return res; // refresh is dead; surface the original 401 to the caller
    }
    return send(path, init);
  }

  return { login, acceptInvite, restore, me, getAccessToken, switchOrg, logout, authedFetch, onAuthChange, refreshToken };
}
