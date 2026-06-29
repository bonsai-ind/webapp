import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { ErrorNote, Field, primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import { Segmented } from "../ui/Segmented";
import { useLogFeed } from "./useLogFeed";

const METHODS: Array<"Bottle" | "Breast"> = ["Bottle", "Breast"];

// "HH:MM" for now, the form's default feed time.
function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Turn the form's "HH:MM" into an RFC3339 instant today (falls back to now). Time
// only — feeds are logged for today; backfilling earlier days is a later concern.
function startedAtFrom(hhmm: string): string {
  const d = new Date();
  if (hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d.toISOString();
}

// Inline "Log a feed" form (mirrors devices/ShareDeviceDialog). Bottle feeds capture
// volume in ml, breast feeds capture duration in minutes — matching the wire shape.
export function AddFeedForm({
  session,
  babyId,
  onDone,
}: {
  session: Session;
  babyId?: string;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<"Bottle" | "Breast">("Bottle");
  const [time, setTime] = useState(nowTime);
  const [amount, setAmount] = useState(""); // ml, bottle
  const [minutes, setMinutes] = useState(""); // min, breast
  const log = useLogFeed(session, babyId);

  const isBottle = method === "Bottle";
  const value = isBottle ? amount : minutes;
  const valid = babyId !== undefined && value.trim() !== "" && Number(value) > 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    log.mutate(
      {
        method: isBottle ? "bottle" : "breast",
        startedAt: startedAtFrom(time),
        ...(isBottle
          ? { volumeMl: Number(amount) }
          : { durationSeconds: Number(minutes) * 60 }),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]"
    >
      <p className="text-[13.5px] font-semibold text-ink">Log a feed</p>
      {log.isError && <ErrorNote>Couldn’t save this feed. Please try again.</ErrorNote>}
      <Segmented options={METHODS} value={method} onChange={setMethod} />
      <Field label="Time" type="time" value={time} onChange={setTime} />
      {isBottle ? (
        <Field label="Amount (ml)" type="number" value={amount} onChange={setAmount} />
      ) : (
        <Field label="Duration (min)" type="number" value={minutes} onChange={setMinutes} />
      )}
      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || log.isPending}
          className={`flex-1 ${primaryButtonClass}`}
        >
          {log.isPending ? "Saving…" : "Save feed"}
        </button>
      </div>
    </form>
  );
}
