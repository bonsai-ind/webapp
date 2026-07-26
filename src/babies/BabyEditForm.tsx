import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { ErrorNote, Field, primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import { ChoiceRow } from "./ChoiceRow";
import { useUpdateBaby, type BabyProfileInput } from "./babies-api";
import type { Baby } from "./useBabies";

const numStr = (n?: number) => (n === undefined ? "" : String(n));
const numOr = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));

const AVATAR_STYLES = ["notionists", "adventurer", "thumbs", "bottts"] as const;

function SectionLabel({ children }: { children: string }) {
  return <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-ink-3">{children}</p>;
}

// Full-replace edit of a baby profile, grouped into sections. Any caregiver can
// edit; save is explicit (shared data).
export function BabyEditForm({
  session,
  baby,
  onDone,
  onCancel,
}: {
  session: Session;
  baby: Baby;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: baby.name ?? "",
    avatarUrl: baby.avatarUrl ?? "",
    dateOfBirth: baby.dateOfBirth ?? "",
    sex: (baby.sex ?? "") as "male" | "female" | "",
    gestationalAgeWeeks: numStr(baby.gestationalAgeWeeks),
    birthWeightKg: numStr(baby.birthWeightKg),
    birthLengthCm: numStr(baby.birthLengthCm),
    birthHeadCircumferenceCm: numStr(baby.birthHeadCircumferenceCm),
    deliveryType: (baby.deliveryType ?? "") as "vaginal" | "cesarean" | "",
    bloodType: baby.bloodType ?? "",
    allergies: baby.allergies ?? "",
    medicalNotes: baby.medicalNotes ?? "",
    pediatricianName: baby.pediatricianName ?? "",
    pediatricianPhone: baby.pediatricianPhone ?? "",
    emergencyContactName: baby.emergencyContactName ?? "",
    emergencyContactPhone: baby.emergencyContactPhone ?? "",
    emergencyContactRelation: baby.emergencyContactRelation ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const update = useUpdateBaby(session, baby.id);
  const valid = f.name.trim() !== "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const body: BabyProfileInput = {
      name: f.name.trim(),
      avatarUrl: f.avatarUrl.trim(),
      dateOfBirth: f.dateOfBirth || undefined,
      sex: f.sex,
      gestationalAgeWeeks: numOr(f.gestationalAgeWeeks),
      birthWeightKg: numOr(f.birthWeightKg),
      birthLengthCm: numOr(f.birthLengthCm),
      birthHeadCircumferenceCm: numOr(f.birthHeadCircumferenceCm),
      deliveryType: f.deliveryType,
      bloodType: f.bloodType.trim(),
      allergies: f.allergies.trim(),
      medicalNotes: f.medicalNotes.trim(),
      pediatricianName: f.pediatricianName.trim(),
      pediatricianPhone: f.pediatricianPhone.trim(),
      emergencyContactName: f.emergencyContactName.trim(),
      emergencyContactPhone: f.emergencyContactPhone.trim(),
      emergencyContactRelation: f.emergencyContactRelation.trim(),
    };
    update.mutate(body, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {update.isError && <ErrorNote>Couldn’t save. Please try again.</ErrorNote>}

      <SectionLabel>Basics</SectionLabel>
      <Field label="Name" value={f.name} onChange={set("name")} />
      <Field label="Date of birth" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
      <ChoiceRow
        label="Sex"
        value={f.sex}
        onChange={(v) => setF((s) => ({ ...s, sex: v }))}
        options={[
          { value: "male", label: "Boy" },
          { value: "female", label: "Girl" },
        ]}
      />
      <Field label="Gestational age at birth (weeks)" type="number" value={f.gestationalAgeWeeks} onChange={set("gestationalAgeWeeks")} />
      <Field label="Photo URL" value={f.avatarUrl} onChange={set("avatarUrl")} />
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => set("avatarUrl")(`https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(f.name || baby.name)}`)}
            className="rounded-[10px] border border-line-2 bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 hover:border-ink-3"
          >
            {style}
          </button>
        ))}
      </div>

      <SectionLabel>Birth</SectionLabel>
      <Field label="Birth weight (kg)" type="number" value={f.birthWeightKg} onChange={set("birthWeightKg")} />
      <Field label="Birth length (cm)" type="number" value={f.birthLengthCm} onChange={set("birthLengthCm")} />
      <Field label="Birth head circ (cm)" type="number" value={f.birthHeadCircumferenceCm} onChange={set("birthHeadCircumferenceCm")} />
      <ChoiceRow
        label="Delivery"
        value={f.deliveryType}
        onChange={(v) => setF((s) => ({ ...s, deliveryType: v }))}
        options={[
          { value: "vaginal", label: "Vaginal" },
          { value: "cesarean", label: "Cesarean" },
        ]}
      />

      <SectionLabel>Care (reference info, not a medical record)</SectionLabel>
      <Field label="Blood type" value={f.bloodType} onChange={set("bloodType")} />
      <Field label="Allergies" value={f.allergies} onChange={set("allergies")} />
      <Field label="Conditions / medications" value={f.medicalNotes} onChange={set("medicalNotes")} />
      <Field label="Pediatrician" value={f.pediatricianName} onChange={set("pediatricianName")} />
      <Field label="Pediatrician phone" type="tel" value={f.pediatricianPhone} onChange={set("pediatricianPhone")} />

      <SectionLabel>Emergency contact (used by SOS)</SectionLabel>
      <Field label="Contact name" value={f.emergencyContactName} onChange={set("emergencyContactName")} />
      <Field label="Contact phone" type="tel" value={f.emergencyContactPhone} onChange={set("emergencyContactPhone")} />
      <Field label="Relationship" value={f.emergencyContactRelation} onChange={set("emergencyContactRelation")} />

      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={!valid || update.isPending} className={`flex-1 ${primaryButtonClass}`}>
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-[10.5px] text-ink-3">Changes are visible to caregivers with access.</p>
    </form>
  );
}
