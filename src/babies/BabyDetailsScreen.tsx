import { useState } from "react";
import type { Session } from "../session/session";
import { BabyAvatar } from "./BabyAvatar";
import { BabyEditForm } from "./BabyEditForm";
import { useArchiveBaby } from "./babies-api";
import type { Baby } from "./useBabies";

function ageLabel(weeks?: number): string | null {
  if (weeks == null) return null;
  if (weeks < 12) return `${weeks} ${weeks === 1 ? "week" : "weeks"} old`;
  return `${Math.round(weeks / 4.345)} months old`;
}

// One read-only field row; renders nothing when empty.
function Row({ label, value, href }: { label: string; value?: string | number; href?: string }) {
  if (value === undefined || value === "" ) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-ink-3">{label}</span>
      {href ? (
        <a href={href} className="text-[13.5px] font-semibold text-primary">
          {value}
        </a>
      ) : (
        <span className="text-[13.5px] font-medium text-ink">{value}</span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-[18px]">
      <p className="label mb-1">{title}</p>
      {children}
    </section>
  );
}

// Full-screen baby profile: read-only sections + an explicit Edit; owner-only
// archive. Opened from the header baby-switcher.
export function BabyDetailsScreen({
  session,
  baby,
  onClose,
  onArchived,
}: {
  session: Session;
  baby: Baby;
  onClose: () => void;
  onArchived: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const archive = useArchiveBaby(session, onArchived);
  const preterm = baby.gestationalAgeWeeks !== undefined && baby.gestationalAgeWeeks < 37;
  const age = ageLabel(baby.ageWeeks);
  const sexLabel = baby.sex === "male" ? "Boy" : baby.sex === "female" ? "Girl" : undefined;
  const tel = (p?: string) => (p ? `tel:${p.replace(/[^\d+]/g, "")}` : undefined);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-3 px-[18px] py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-surface text-[18px] text-ink-2">
          ✕
        </button>
        <h1 className="text-[19px] font-extrabold text-ink">{editing ? "Edit profile" : "Baby profile"}</h1>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="ml-auto text-[14px] font-semibold text-primary">
            Edit
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[18px] pb-10">
        <div className="flex items-center gap-3">
          <BabyAvatar name={baby.name} avatarUrl={baby.avatarUrl} size={64} />
          <div className="min-w-0">
            <p className="text-[20px] font-extrabold text-ink">{baby.name}</p>
            <p className="text-[12.5px] text-ink-2">
              {[age, sexLabel].filter(Boolean).join(" · ") || "Add details below"}
              {preterm && <span className="ml-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">corrected age</span>}
            </p>
          </div>
        </div>

        {editing ? (
          <BabyEditForm session={session} baby={baby} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <Section title="Basics">
              <Row label="Date of birth" value={baby.dateOfBirth} />
              <Row label="Sex" value={sexLabel} />
              <Row label="Gestational age" value={baby.gestationalAgeWeeks ? `${baby.gestationalAgeWeeks} weeks` : undefined} />
            </Section>

            {(baby.birthWeightKg || baby.birthLengthCm || baby.birthHeadCircumferenceCm || baby.deliveryType) && (
              <Section title="Birth">
                <Row label="Weight" value={baby.birthWeightKg ? `${baby.birthWeightKg} kg` : undefined} />
                <Row label="Length" value={baby.birthLengthCm ? `${baby.birthLengthCm} cm` : undefined} />
                <Row label="Head circ" value={baby.birthHeadCircumferenceCm ? `${baby.birthHeadCircumferenceCm} cm` : undefined} />
                <Row label="Delivery" value={baby.deliveryType} />
              </Section>
            )}

            {(baby.bloodType || baby.allergies || baby.medicalNotes || baby.pediatricianName) && (
              <Section title="Care · reference info, not a medical record">
                <Row label="Blood type" value={baby.bloodType} />
                <Row label="Allergies" value={baby.allergies} />
                <Row label="Conditions / meds" value={baby.medicalNotes} />
                <Row label="Pediatrician" value={baby.pediatricianName} />
                <Row label="Pediatrician phone" value={baby.pediatricianPhone} href={tel(baby.pediatricianPhone)} />
              </Section>
            )}

            {(baby.emergencyContactName || baby.emergencyContactPhone) && (
              <Section title="Emergency contact · used by SOS">
                <Row label="Name" value={baby.emergencyContactName} />
                <Row label="Phone" value={baby.emergencyContactPhone} href={tel(baby.emergencyContactPhone)} />
                <Row label="Relationship" value={baby.emergencyContactRelation} />
              </Section>
            )}

            <p className="text-[11px] text-ink-3">Shared with the caregivers who have access to this baby.</p>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${baby.name}? This hides the baby; history is kept.`)) archive.mutate(baby.id);
              }}
              className="h-11 rounded-[14px] border border-alert/40 bg-alert-soft font-semibold text-alert"
            >
              Remove baby
            </button>
            {archive.isError && <p className="text-[12px] text-amber">Only the baby's owner can remove it.</p>}
          </>
        )}
      </div>
    </div>
  );
}
