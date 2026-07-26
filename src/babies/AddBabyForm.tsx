import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { ErrorNote, Field, primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import { ChoiceRow } from "./ChoiceRow";
import { useCreateBaby } from "./babies-api";
import type { Baby } from "./useBabies";

// Guided minimal add: name (required), DOB, sex. The rest of the profile is
// filled later from Edit. On success the new baby becomes active.
export function AddBabyForm({
  session,
  onDone,
  onCreated,
}: {
  session: Session;
  onDone: () => void;
  onCreated?: (baby: Baby) => void;
}) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const create = useCreateBaby(session, onCreated);
  const valid = name.trim() !== "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    create.mutate(
      { name: name.trim(), ...(dob ? { dateOfBirth: dob } : {}), ...(sex ? { sex } : {}) },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
      <p className="text-[13.5px] font-semibold text-ink">Add your baby</p>
      {create.isError && <ErrorNote>Couldn’t add the baby. Please try again.</ErrorNote>}
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Date of birth" type="date" value={dob} onChange={setDob} />
      <ChoiceRow
        label="Sex"
        value={sex}
        onChange={setSex}
        options={[
          { value: "male", label: "Boy" },
          { value: "female", label: "Girl" },
        ]}
      />
      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={!valid || create.isPending} className={`flex-1 ${primaryButtonClass}`}>
          {create.isPending ? "Adding…" : "Add baby"}
        </button>
      </div>
      <p className="text-[10.5px] text-ink-3">Sex + date of birth power the growth percentiles. You can edit everything later.</p>
    </form>
  );
}
