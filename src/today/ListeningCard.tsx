import type { CryStatus } from "../cries/cry-status";
import { Waveform } from "../ui/Waveform";

// "Open live monitor" glass button — white-on-indigo, glass style.
function GlassButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[13px] border border-white/25 bg-white/[0.16] px-4 py-2.5 text-[13.5px] font-semibold text-white backdrop-blur-sm transition-opacity active:opacity-80"
    >
      {children}
    </button>
  );
}

// Indigo gradient hero card on the Today screen. Shows the live monitoring
// status (calm / fussing) and a link to the live monitor. The crying state is
// handled by the full-screen CryAlertOverlay above this card (Variant A).
export function ListeningCard({
  status,
  onOpenMonitor,
}: {
  status: CryStatus;
  onOpenMonitor: () => void;
}) {
  const fussing = status.status === "fussing";

  return (
    <div
      role="region"
      aria-label="Monitoring status"
      className="relative overflow-hidden rounded-card p-[18px]"
      style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-700) 100%)",
        boxShadow: "0 14px 30px -12px rgba(108,92,231,0.6)",
      }}
    >
      {/* Live indicator */}
      <div className="mb-3 flex items-center gap-2">
        <span className="relative size-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-white/60 motion-safe:animate-ping" />
          <span className="relative block size-2 rounded-full bg-white" />
        </span>
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-white/60">
          Listening
        </span>
      </div>

      {/* Status headline */}
      <p className="num text-[26px] font-extrabold tracking-[-0.03em] text-white">
        {fussing ? "Fussing" : "All calm"}
      </p>
      <p className="mb-4 mt-0.5 text-[13px] font-medium text-white/70">
        {fussing ? "Baby may be unsettled" : "No cry detected"}
      </p>

      {/* Mini waveform */}
      <div className="mb-5">
        <Waveform bars={12} animate color="rgba(255,255,255,0.45)" />
      </div>

      <GlassButton onClick={onOpenMonitor}>Open live monitor</GlassButton>
    </div>
  );
}
