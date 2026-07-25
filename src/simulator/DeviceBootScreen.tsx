import { useEffect, useState, type FormEvent } from "react";
import { ErrorNote, Field, primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import { ApiError } from "../api/get-json";
import type { SimDeviceState } from "./useSimulatedDevice";

// The simulated box's "physical screen" while unclaimed: the Pairing Code shown
// huge (the proof-of-possession a caregiver reads off the device, ADR 0010),
// plus the claim form — which on real hardware lives in the companion app, but
// here shares the page so the device tokens land in this simulator.
export function DeviceBootScreen({
  state,
  onClaim,
  onReRegister,
}: {
  state: SimDeviceState;
  onClaim: (name: string) => Promise<void>;
  onReRegister: () => Promise<void>;
}) {
  const [name, setName] = useState("Sim Cam");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const secondsLeft = useCountdown(state.codeExpiresAt);

  // The Pairing Code is single-use and 10-minute-boxed; an expired one is dead,
  // so re-register to rotate it, exactly like a real box would.
  useEffect(() => {
    if (secondsLeft === 0 && state.phase === "unclaimed") void onReRegister();
  }, [secondsLeft, state.phase, onReRegister]);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setClaimError(null);
    try {
      await onClaim(name.trim() || "Sim Cam");
    } catch (err) {
      setClaimError(
        err instanceof ApiError && err.status === 404
          ? "Pairing code not recognized — it may have expired. Get a new code and try again."
          : "Claiming failed. Check the backend and try again.",
      );
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-[18px] py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-card border border-line bg-surface p-7 text-center">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.13em] text-ink-3">
          Serial {state.serial}
        </span>
        {state.phase === "booting" ? (
          <p className="py-8 text-[14px] text-ink-2">Booting…</p>
        ) : (
          <>
            <p className="text-[12.5px] text-ink-2">Pairing code</p>
            <p
              className="font-mono text-[44px] font-bold tracking-[0.18em] text-ink"
              data-testid="pairing-code"
            >
              {state.pairingCode ?? "————"}
            </p>
            {secondsLeft !== null && (
              <p className="font-mono text-[11px] text-ink-3" style={{ fontVariantNumeric: "tabular-nums" }}>
                expires in {formatSeconds(secondsLeft)}
              </p>
            )}
            <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => void onReRegister()}>
              New code
            </button>
          </>
        )}
        {state.error && <ErrorNote>{state.error}</ErrorNote>}
      </div>

      {state.phase === "unclaimed" && (
        <form onSubmit={handleClaim} className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
          <p className="text-[12.5px] text-ink-2">
            On real hardware this step happens in the companion app. Claim the device here to activate it.
          </p>
          <Field label="Device name" value={name} onChange={setName} />
          {claimError && <ErrorNote>{claimError}</ErrorNote>}
          <button type="submit" className={primaryButtonClass} disabled={claiming || !state.pairingCode}>
            {claiming ? "Claiming…" : "Claim this device"}
          </button>
        </form>
      )}
    </div>
  );
}

function useCountdown(expiresAt?: string): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const compute = () =>
      setSecondsLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    compute();
    const timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return secondsLeft;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
