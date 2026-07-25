import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeviceSession } from "./device-session";
import { reportDistressAlert } from "./device-api";
import {
  decide,
  evaluate,
  EMERGENCY,
  SELF_REG,
  type AlertLevel,
  type DistressCue,
} from "./distress-rules";

// Distress is time-critical, so the tick is fast (unlike the hourly temperature
// loop): a held state escalates one tier every couple of ticks (inconsolability).
const TICK_MS = 20_000;

// A held non-emergency concern drives the escalation counter; only self-reg or
// emergency (or nothing) resets it.
const hasConcern = (cues: DistressCue[]) =>
  cues.some((c) => !SELF_REG.includes(c) && !EMERGENCY.includes(c));

const confidenceFor = (level: AlertLevel): number =>
  level === "emergency" ? 0.95 : level === "distress" ? 0.85 : 0.7;

const autoCallReason = (primaryCue?: DistressCue): string =>
  primaryCue === "face_covered" ? "face may be covered" : "needs attention";

// The simulated distress firmware: the selected cues drive the pure rules
// engine (distress-rules.ts), which opens/closes/escalates alert episodes just
// like real on-device CV fusion will. An emergency covered-face open also fires
// the auto-call (onAutoCall). UI toggles only set which cues are "observed".
export function useDistressLoop({
  deviceSession,
  enabled,
  asleep,
  onAutoCall,
}: {
  deviceSession: DeviceSession;
  enabled: boolean;
  asleep: boolean;
  onAutoCall: (reason: string) => void;
}) {
  const [cues, setCues] = useState<DistressCue[]>([]);
  const [sustainedTicks, setSustainedTicks] = useState(0);
  const [active, setActive] = useState<{ episodeId: string; level: AlertLevel } | null>(null);
  const [failed, setFailed] = useState(false);

  const evaluation = useMemo(
    () => evaluate(cues, { asleep, sustainedTicks }),
    [cues, asleep, sustainedTicks],
  );

  const cuesRef = useRef(cues);
  cuesRef.current = cues;
  const activeRef = useRef(active);
  activeRef.current = active;
  const evalRef = useRef(evaluation);
  evalRef.current = evaluation;
  const inflightRef = useRef(false);

  // Post the episode action implied by the current evaluation vs the active
  // episode. Serialized (inflightRef) so a fast cue toggle can't double-open.
  const sync = useCallback(async () => {
    if (inflightRef.current) return;
    const evalNow = evalRef.current;
    const action = decide(activeRef.current, evalNow.level);
    if (action.kind === "none") return;
    inflightRef.current = true;
    setFailed(false);
    try {
      // A clear or a level change first closes the open episode.
      if (activeRef.current && (action.kind === "clear" || action.kind === "set")) {
        await reportDistressAlert(deviceSession, {
          episodeId: activeRef.current.episodeId,
          state: "clear",
          level: activeRef.current.level,
          cues: [],
          confidence: 0,
          modelVersion: "sim",
        });
        activeRef.current = null;
        setActive(null);
      }
      if (action.kind === "set") {
        const episodeId = `dis_sim_${crypto.randomUUID()}`;
        await reportDistressAlert(deviceSession, {
          episodeId,
          state: "alert",
          level: action.level,
          cues: evalNow.cues,
          confidence: confidenceFor(action.level),
          modelVersion: "sim",
        });
        activeRef.current = { episodeId, level: action.level };
        setActive({ episodeId, level: action.level });
        if (evalNow.autoCall) onAutoCall(autoCallReason(evalNow.primaryCue));
      }
    } catch {
      setFailed(true);
    } finally {
      inflightRef.current = false;
    }
  }, [deviceSession, onAutoCall]);

  // React to any change in the evaluated level (cue toggle or an escalation).
  useEffect(() => {
    if (!enabled) return;
    void sync();
  }, [enabled, evaluation, sync]);

  // Duration gate: while a concern persists, bump sustainedTicks so a held
  // state escalates one tier; reset when nothing concerning remains.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setSustainedTicks((t) => (hasConcern(cuesRef.current) ? t + 1 : 0));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  const toggleCue = (cue: DistressCue) =>
    setCues((cs) => (cs.includes(cue) ? cs.filter((c) => c !== cue) : [...cs, cue]));
  const setScenario = (cs: DistressCue[]) => {
    setSustainedTicks(0);
    setCues(cs);
  };
  const clearAll = () => {
    setSustainedTicks(0);
    setCues([]);
  };

  return { cues, evaluation, active, failed, toggleCue, setScenario, clearAll, sendNow: sync };
}
