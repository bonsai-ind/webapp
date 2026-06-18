import type { Session } from "../session/session";

// Carries the HTTP status so callers/UI can branch (e.g. 404 vs 500) instead of
// crashing on a non-JSON error body.
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
  }
}

// Authenticated GET → parsed JSON, or a typed ApiError on any non-2xx. Centralises
// response handling for the data hooks so a text error body (e.g. the backend's
// "404 page not found") never reaches JSON.parse.
export async function getJson<T>(session: Session, path: string): Promise<T> {
  const res = await session.authedFetch(path);
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

// Authenticated POST with a JSON body → parsed JSON, or a typed ApiError on non-2xx.
export async function postJson<T>(session: Session, path: string, body: unknown): Promise<T> {
  const res = await session.authedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

const MAX_RETRIES = 2;

// Authenticated DELETE → 204 No Content, or a typed ApiError on non-2xx.
export async function deleteJson(session: Session, path: string): Promise<void> {
  const res = await session.authedFetch(path, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status);
}

// Authenticated POST with a JSON body → 204 No Content, or a typed ApiError on non-2xx.
export async function postVoid(session: Session, path: string, body?: unknown): Promise<void> {
  const res = await session.authedFetch(path, {
    method: "POST",
    ...(body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  if (!res.ok) throw new ApiError(res.status);
}

// TanStack Query retry predicate: a 4xx won't recover (missing/forbidden), so
// don't waste attempts; retry 5xx / network errors up to a cap.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}
