import { useEffect, useState } from "react";
import type { CryEpisode } from "./cry-status";

// "Started 18s ago" — ticks every second from the client-side onset receipt.
function elapsedLabel(startedAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - startedAt) / 1000));
  if (s < 60) return `Started ${s}s ago`;
  const m = Math.floor(s / 60);
  return `Started ${m}m ${s % 60}s ago`;
}

// Variant A — full-screen takeover (DESIGN.md §3, slice 12). Saturated red,
// reserved for an active cry. The foreground layer; OS push wakes a locked phone.
export function CryAlert({
  episode,
  onOpen,
  onSnooze,
}: {
  episode: CryEpisode;
  onOpen: () => void;
  onSnooze: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="alertdialog"
      aria-label={`${episode.babyName} is crying`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-alert to-alert-2 px-[18px] text-center text-white motion-safe:[animation:cry-in_180ms_ease-out]"
    >
      <span
        className="size-16 rounded-full bg-white/20 motion-safe:animate-ping"
        aria-hidden="true"
      />
      <h1 className="text-[31px] font-extrabold tracking-[-0.02em] whitespace-nowrap">
        {episode.babyName} is crying
      </h1>
      <p className="font-mono text-[12px] text-white/80" style={{ fontVariantNumeric: "tabular-nums" }}>
        {elapsedLabel(episode.startedAt, now)}
      </p>
      {episode.cause && (
        <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[12px] capitalize">
          Likely cause: {episode.cause}
        </span>
      )}
      {episode.lastFedAgo && (
        <p className="font-mono text-[12px] text-white/80">Last fed {episode.lastFedAgo}</p>
      )}
      <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="h-12 rounded-[14px] bg-white font-semibold text-alert-2"
        >
          Open live monitor
        </button>
        <button
          type="button"
          onClick={onSnooze}
          className="h-11 rounded-[14px] border border-white/40 bg-white/10 font-semibold text-white"
        >
          Snooze 5 min
        </button>
      </div>
    </div>
  );
}
