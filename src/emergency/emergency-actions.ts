import type { Session } from "../session/session";
import { postJson } from "../api/get-json";

export type SosKind = "ambulance" | "doctor" | "other";

export interface SosLocation {
  lat: number;
  lng: number;
}

// Log a raised SOS (and, server-side, alert the family when a baby is in
// context). Fire-and-forget from the UI — the tel: dial happens in parallel.
export async function createSos(
  session: Session,
  input: { babyId?: string; kind: SosKind; location?: SosLocation | null; note?: string },
): Promise<{ sosId: string }> {
  return postJson<{ sosId: string }>(session, "/emergency/sos", {
    babyId: input.babyId || undefined,
    kind: input.kind,
    lat: input.location?.lat,
    lng: input.location?.lng,
    note: input.note,
  });
}

// Best-effort browser geolocation — resolves null on denial/absence/timeout, so
// the emergency flow never blocks on it.
export function getLocation(): Promise<SosLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60_000 },
    );
  });
}

// A dialable tel: href (strips formatting to digits/plus).
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// A Google Maps link for a captured location.
export const mapsHref = (loc: SosLocation) => `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
