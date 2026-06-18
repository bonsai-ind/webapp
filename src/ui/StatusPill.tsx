export type StatusTone = "calm" | "crying" | "fussing" | "sleep" | "neutral";

// Each tone pairs a default label with its tonal colors (DESIGN.md): *-soft
// background + solid foreground/dot. Red is reserved for an active cry only.
const TONES: Record<StatusTone, { label: string; className: string; dot: string }> = {
  calm: { label: "All calm", className: "bg-calm-soft text-calm", dot: "bg-calm" },
  crying: { label: "Crying", className: "bg-alert-soft text-alert", dot: "bg-alert" },
  fussing: { label: "Fussing", className: "bg-amber-soft text-amber", dot: "bg-amber" },
  sleep: { label: "Sleeping", className: "bg-sleep-soft text-sleep", dot: "bg-sleep" },
  neutral: { label: "Idle", className: "bg-surface-2 text-ink-2", dot: "bg-ink-3" },
};

export function StatusPill({ tone, label }: { tone: StatusTone; label?: string }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${t.className}`}
    >
      <span className={`size-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      {label ?? t.label}
    </span>
  );
}
