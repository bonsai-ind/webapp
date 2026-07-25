import { useEffect, useState } from "react";
import type { Session } from "../session/session";
import type { Baby } from "../babies/useBabies";
import { useEmergencyProviders, type EmergencyProvider } from "./useEmergency";
import { createSos, getLocation, mapsHref, telHref, type SosKind, type SosLocation } from "./emergency-actions";

const FALLBACK_AMBULANCE = "+1-555-0100";
const FALLBACK_DOCTOR = "+1-555-0110";

const CATEGORY_ORDER: EmergencyProvider["category"][] = [
  "ambulance",
  "doctor",
  "clinic",
  "poison_control",
  "mental_health",
];
const CATEGORY_LABEL: Record<EmergencyProvider["category"], string> = {
  ambulance: "Ambulance",
  doctor: "Doctors — 24/7",
  clinic: "Clinics & ER",
  poison_control: "Poison control",
  mental_health: "Mental health",
};

function ageLabel(weeks?: number): string | null {
  if (weeks == null) return null;
  if (weeks < 12) return `${weeks} ${weeks === 1 ? "week" : "weeks"} old`;
  return `${Math.round(weeks / 4.345)} months old`;
}

function ProviderCard({ provider }: { provider: EmergencyProvider }) {
  return (
    <a
      href={telHref(provider.phone)}
      className="flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-white">{provider.name}</p>
          {provider.is247 && (
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">24/7</span>
          )}
        </div>
        {provider.description && <p className="truncate text-[11.5px] text-white/60">{provider.description}</p>}
        <p className="text-[11px] text-white/45">{provider.hours || provider.region}</p>
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-[15px]" aria-hidden="true">
        📞
      </span>
    </a>
  );
}

// The full-screen Emergency (SOS) screen: an aid, not a dispatch service. Two
// giant tap-to-call actions (ambulance / doctor) that also log the SOS and alert
// the family, plus the full provider directory. Location is captured best-effort.
export function EmergencyScreen({
  session,
  baby,
  onClose,
}: {
  session: Session;
  baby?: Baby;
  onClose: () => void;
}) {
  const { providers } = useEmergencyProviders(session);
  const [location, setLocation] = useState<SosLocation | null>(null);
  const [locState, setLocState] = useState<"pending" | "ready" | "off">("pending");

  // Capture location once on open (best-effort; never blocks the actions).
  useEffect(() => {
    let live = true;
    void getLocation().then((loc) => {
      if (!live) return;
      setLocation(loc);
      setLocState(loc ? "ready" : "off");
    });
    return () => {
      live = false;
    };
  }, []);

  const ambulancePhone = providers.find((p) => p.category === "ambulance")?.phone ?? FALLBACK_AMBULANCE;
  const doctorPhone = providers.find((p) => p.category === "doctor")?.phone ?? FALLBACK_DOCTOR;

  // Log + family-alert; the tel: link dials in parallel. Never blocks the call.
  const raise = (kind: SosKind) => {
    void createSos(session, { babyId: baby?.id, kind, location }).catch(() => {});
  };

  const age = ageLabel(baby?.ageWeeks);

  return (
    <div role="dialog" aria-label="Emergency" className="fixed inset-0 z-[70] overflow-y-auto bg-ink text-white">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-[18px] py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Emergency</h1>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 text-[18px]">
            ✕
          </button>
        </div>

        {/* Permanent safety reminder — this is an aid, not emergency services. */}
        <div className="rounded-[14px] bg-amber-soft px-4 py-3 text-[12.5px] font-medium text-amber">
          Not a substitute for emergency services. In a life-threatening emergency, call your local emergency
          number (e.g. 911 or 112).
        </div>

        {baby && (
          <p className="text-[12.5px] text-white/70">
            For {baby.name}
            {age ? ` · ${age}` : ""}
          </p>
        )}

        {/* Location status + share link. */}
        <div className="flex items-center gap-2 text-[12px]">
          <span aria-hidden="true">📍</span>
          {locState === "pending" && <span className="text-white/60">Getting your location…</span>}
          {locState === "off" && <span className="text-white/60">Location off — tell the responder your address.</span>}
          {locState === "ready" && location && (
            <a href={mapsHref(location)} target="_blank" rel="noreferrer noopener" className="font-semibold text-white underline">
              Location ready — open map
            </a>
          )}
        </div>

        {/* The two giant tap-to-call actions. */}
        <a
          href={telHref(ambulancePhone)}
          onClick={() => raise("ambulance")}
          className="grid h-16 place-items-center rounded-[16px] bg-alert text-[18px] font-extrabold text-white shadow-lg"
        >
          🚑 Call ambulance
        </a>
        <a
          href={telHref(doctorPhone)}
          onClick={() => raise("doctor")}
          className="grid h-16 place-items-center rounded-[16px] bg-white text-[18px] font-extrabold text-ink shadow-lg"
        >
          🩺 Talk to a doctor 24/7
        </a>

        {/* Full provider network directory, grouped by category. */}
        <div className="mt-1 flex flex-col gap-4">
          {CATEGORY_ORDER.filter((cat) => providers.some((p) => p.category === cat)).map((cat) => (
            <div key={cat}>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-white/45">{CATEGORY_LABEL[cat]}</p>
              <div className="overflow-hidden rounded-[14px] bg-white/5">
                {providers.filter((p) => p.category === cat).map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
