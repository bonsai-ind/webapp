import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { ErrorNote, Field, primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import { useLogGrowth } from "./growth-api";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
const pos = (v: string) => v.trim() !== "" && Number(v) > 0;

// Inline "Add measurement" form — weight (kg), length (cm), head circumference
// (cm); any subset, at least one. Metric-only (WHO tables are metric).
export function AddGrowthForm({
  session,
  babyId,
  onDone,
}: {
  session: Session;
  babyId?: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState(todayISO);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [head, setHead] = useState("");
  const log = useLogGrowth(session, babyId);

  const valid = babyId !== undefined && (pos(weight) || pos(length) || pos(head));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    log.mutate(
      {
        takenAt: new Date(`${date}T12:00:00`).toISOString(),
        ...(pos(weight) ? { weightKg: Number(weight) } : {}),
        ...(pos(length) ? { lengthCm: Number(length) } : {}),
        ...(pos(head) ? { headCircumferenceCm: Number(head) } : {}),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
      <p className="text-[13.5px] font-semibold text-ink">Add measurement</p>
      {log.isError && <ErrorNote>Couldn’t save this measurement. Please try again.</ErrorNote>}
      <Field label="Date" type="date" value={date} onChange={setDate} />
      <Field label="Weight (kg)" type="number" value={weight} onChange={setWeight} />
      <Field label="Length (cm)" type="number" value={length} onChange={setLength} />
      <Field label="Head circumference (cm)" type="number" value={head} onChange={setHead} />
      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={!valid || log.isPending} className={`flex-1 ${primaryButtonClass}`}>
          {log.isPending ? "Saving…" : "Save measurement"}
        </button>
      </div>
    </form>
  );
}
