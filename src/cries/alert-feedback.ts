// Audible + haptic feedback for an active cry alert (DESIGN.md: "Alerts must
// also fire OS push + sound/vibration; the in-app treatment is the foreground
// layer only"). A soft two-tone chirp repeats every few seconds while the alert
// is up, plus a vibration burst on start. Everything is best-effort:
// - Browser autoplay policy blocks audio until the user has interacted with the
//   page once; a suspended AudioContext just stays silent (no error).
// - navigator.vibrate exists only on supporting devices (mostly Android).
// - jsdom/test environments lack AudioContext entirely — all paths are guarded.

const CHIRP_INTERVAL_MS = 4000;
const VIBRATE_PATTERN = [200, 100, 200];

export interface AlertFeedback {
  stop(): void;
}

function chirp(ctx: AudioContext): void {
  // Two rising soft sine notes, ~0.4s total — urgent but not alarming.
  for (const [offset, freq] of [
    [0, 740],
    [0.22, 988],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }
}

// startAlertFeedback begins the repeating chirp + initial vibration and returns
// a handle whose stop() silences everything. Safe to call in any environment.
export function startAlertFeedback(): AlertFeedback {
  try {
    navigator.vibrate?.(VIBRATE_PATTERN);
  } catch {
    // vibration unsupported — ignore
  }

  let ctx: AudioContext | null = null;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (Ctor) {
    try {
      ctx = new Ctor();
      // If the page has had a user gesture, resume() unlocks; otherwise the
      // context stays suspended and the chirps are silently skipped.
      void ctx.resume().catch(() => {});
    } catch {
      ctx = null;
    }
  }

  const beat = () => {
    if (ctx && ctx.state === "running") {
      try {
        chirp(ctx);
      } catch {
        // audio node failure — stay silent rather than crash the alert
      }
    }
  };
  beat();
  const timer = setInterval(beat, CHIRP_INTERVAL_MS);

  return {
    stop() {
      clearInterval(timer);
      try {
        navigator.vibrate?.(0); // cancel any in-flight pattern
      } catch {
        // ignore
      }
      void ctx?.close().catch(() => {});
    },
  };
}
