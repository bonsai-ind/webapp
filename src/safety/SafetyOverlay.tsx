import type { LiveSync } from "../realtime/live-sync";
import { useSafetyStatus } from "./useSafetyStatus";
import { postureText } from "./safety-status";

// Overlays a full-bleed safety banner whenever a baby is in a prone/occlusion
// alert. Reuses the Locked `--alert*` red (now "active safety event", ADR 0005) —
// the same visual language as the cry alert, no new design token.
export function SafetyOverlay({
  liveSync,
  onOpenMonitor,
}: {
  liveSync: LiveSync;
  onOpenMonitor?: (babyId?: string) => void;
}) {
  const status = useSafetyStatus(liveSync);
  if (status.status !== "alert" || !status.episode) return null;

  const episode = status.episode;
  return (
    <div
      role="alertdialog"
      aria-label={`${episode.babyName} may be unsafe`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-alert to-alert-2 px-[18px] text-center text-white"
    >
      <h1 className="text-[31px] font-extrabold tracking-[-0.02em]">
        {episode.babyName} may be unsafe
      </h1>
      <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[12px]">
        {postureText(episode.posture)}
      </span>
      <button
        type="button"
        onClick={() => onOpenMonitor?.(episode.babyId)}
        className="h-12 rounded-[14px] bg-white font-semibold text-alert-2"
      >
        Open live monitor
      </button>
    </div>
  );
}
