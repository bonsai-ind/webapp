import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { useWellness, type WellnessProgram, type WellnessSessionItem } from "./useWellness";
import { completeSession, enroll } from "./wellness-actions";
import { VideoEmbed } from "../VideoEmbed";
import { ContentImage } from "../ContentImage";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const pct = (p: WellnessProgram) => (p.sessionCount > 0 ? Math.round((p.completedCount / p.sessionCount) * 100) : 0);

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${value}%` }} />
    </div>
  );
}

function SessionRow({
  program,
  sess,
  session,
}: {
  program: WellnessProgram;
  sess: WellnessSessionItem;
  session: Session;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-pressed={sess.completed}
          aria-label={sess.completed ? "Completed" : "Mark complete"}
          onClick={() => void completeSession(session, qc, program.id, sess.id)}
          className={
            "grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold " +
            (sess.completed ? "border-primary bg-primary text-white" : "border-line-2 text-ink-3")
          }
        >
          {sess.completed ? "✓" : sess.idx}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 text-left">
          <p className="text-[14px] font-semibold text-ink">{sess.title}</p>
          <p className="text-[11px] text-ink-3">{sess.kind === "video" ? "Video" : "Read"}</p>
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2 pl-9">
          {sess.kind === "video" ? (
            <VideoEmbed provider={sess.videoProvider} videoId={sess.videoId} title={sess.title} />
          ) : (
            <p className="text-[13px] text-ink-2">{sess.body}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramDetail({
  program,
  session,
  onBack,
}: {
  program: WellnessProgram;
  session: Session;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
        ← Programs
      </button>
      <ContentImage src={program.imageUrl} alt={program.title} className="h-32 w-full rounded-card object-cover" />
      <div>
        <p className="rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary inline-block">
          {cap(program.topic)}
        </p>
        <h2 className="mt-1 text-[20px] font-extrabold text-ink">{program.title}</h2>
        <p className="text-[13px] text-ink-2">{program.subtitle}</p>
      </div>
      {program.enrolled ? (
        <div className="flex flex-col gap-1">
          <ProgressBar value={pct(program)} />
          <p className="text-[11.5px] text-ink-3">
            {program.completedCount} of {program.sessionCount} sessions complete
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void enroll(session, qc, program.id)}
          className="h-11 rounded-[14px] bg-primary font-semibold text-white"
        >
          Enroll
        </button>
      )}
      <div className="rounded-card border border-line bg-surface px-[18px]">
        {program.sessions.map((s) => (
          <SessionRow key={s.id} program={program} sess={s} session={session} />
        ))}
      </div>
    </div>
  );
}

function ProgramCard({ program, onOpen }: { program: WellnessProgram; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[18px] text-left"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary">
          {cap(program.topic)}
        </span>
        {program.enrolled && <span className="ml-auto text-[11px] font-semibold text-primary">Enrolled</span>}
      </div>
      <h3 className="text-[16px] font-bold text-ink">{program.title}</h3>
      <p className="text-[12.5px] text-ink-2">{program.subtitle}</p>
      {program.enrolled ? (
        <ProgressBar value={pct(program)} />
      ) : (
        <p className="text-[12px] font-semibold text-primary">{program.sessionCount} sessions · Start →</p>
      )}
    </button>
  );
}

// The Wellness tab: maternal programs matched to postpartum stage, with a
// per-program detail + progress tracking.
export function WellnessView({ session, babyId }: { session: Session; babyId?: string }) {
  const { data, isLoading } = useWellness(session, babyId);
  const [openId, setOpenId] = useState<string>();

  const programs = data?.programs ?? [];
  const open = programs.find((p) => p.id === openId);

  if (open) return <ProgramDetail program={open} session={session} onBack={() => setOpenId(undefined)} />;

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-[13px] text-ink-3">Loading…</p>
      ) : programs.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-[18px] text-[13px] text-ink-2">
          No programs for this stage yet.
        </p>
      ) : (
        programs.map((p) => <ProgramCard key={p.id} program={p} onOpen={() => setOpenId(p.id)} />)
      )}
    </div>
  );
}
