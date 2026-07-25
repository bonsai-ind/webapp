import { useState } from "react";
import { Panel } from "./Panel";
import { useBabies } from "../babies/useBabies";
import { BabyAvatar } from "../babies/BabyAvatar";
import type { Session } from "../session/session";

// Baby selection (device pairing): a device pairs to at most one baby; the
// caregiver picks which of their babies this simulated box watches. Pairing is
// a user-plane action, so this panel runs on the signed-in user session.
export function BabyPairPanel({
  session,
  pairedBabyId,
  onPair,
}: {
  session: Session;
  pairedBabyId?: string;
  onPair: (babyId: string) => Promise<void>;
}) {
  const { babies, isLoading } = useBabies(session);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function pair(babyId: string) {
    if (babyId === pairedBabyId) return;
    setBusyId(babyId);
    setFailed(false);
    try {
      await onPair(babyId);
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel title="Watching baby">
      {isLoading ? (
        <p className="text-[12.5px] text-ink-2">Loading babies…</p>
      ) : babies.length === 0 ? (
        <p className="text-[12.5px] text-ink-2">No babies yet — create one in the companion app first.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {babies.map((baby) => {
            const paired = baby.id === pairedBabyId;
            return (
              <li key={baby.id}>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void pair(baby.id)}
                  aria-pressed={paired}
                  className={
                    "flex w-full items-center gap-3 rounded-[14px] border px-3 py-2 text-left transition-colors " +
                    (paired ? "border-primary bg-primary-soft" : "border-transparent hover:border-line-2")
                  }
                >
                  <BabyAvatar name={baby.name} avatarUrl={baby.avatarUrl} size={32} />
                  <span className="flex-1 text-[14px] font-semibold text-ink">{baby.name}</span>
                  {paired && <span className="text-[11.5px] font-semibold text-primary">Watching</span>}
                  {busyId === baby.id && <span className="text-[11.5px] text-ink-3">Pairing…</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {failed && <p className="text-[12px] font-medium text-amber">Pairing failed — try again.</p>}
    </Panel>
  );
}
