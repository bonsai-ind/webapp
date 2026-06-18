import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";

export interface ShareStore {
  memberships: Array<{ deviceId: string; userId: string; role: "primary" | "guest" }>;
  tokens: Record<string, string>; // bearer access token → userId (mock identity)
}

const BASE = "https://api.test";

export function deviceShareHandlers(store: ShareStore): RequestHandler[] {
  let counter = 0;
  const issuedShares = new Map<string, { deviceId: string; used: boolean }>();

  function callerOf(request: Request): string | undefined {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    return token ? store.tokens[token] : undefined;
  }

  function isPrimary(userId: string | undefined, deviceId: string): boolean {
    return store.memberships.some(
      (m) => m.userId === userId && m.deviceId === deviceId && m.role === "primary",
    );
  }

  return [
    http.post(`${BASE}/devices/:id/shares`, ({ request, params }) => {
      const deviceId = params.id as string;
      if (!isPrimary(callerOf(request), deviceId)) {
        return new HttpResponse(null, { status: 403 });
      }
      counter += 1;
      const token = `share-${counter}`;
      issuedShares.set(token, { deviceId, used: false });
      return HttpResponse.json({ token, expires_at: "2026-06-15T00:00:00Z" });
    }),

    http.post(`${BASE}/auth/accept-share`, async ({ request }) => {
      const { token } = (await request.json()) as { token: string };
      const share = issuedShares.get(token);
      if (!share || share.used) {
        return new HttpResponse(null, { status: 401 });
      }
      share.used = true; // single-use
      counter += 1;
      const userId = `usr_guest_${counter}`;
      store.memberships.push({ deviceId: share.deviceId, userId, role: "guest" });
      return HttpResponse.json({
        access_token: `access-${userId}`,
        refresh_token: `refresh-${userId}`,
      });
    }),
  ];
}
