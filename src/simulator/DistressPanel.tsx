import { useState } from "react";
import { Panel } from "./Panel";
import type { DeviceSession } from "./device-session";
import { useDistressLoop } from "./useDistressLoop";
import type { DistressCue, DistressLevel } from "./distress-rules";

// Human labels for each cue, grouped by channel. The order here IS the panel
// layout; the grouping mirrors distress-rules.ts (the firmware contract).
const CUE_GROUPS: { title: string; cues: { cue: DistressCue; label: string }[] }[] = [
  {
    title: "Face (NFCS)",
    cues: [
      { cue: "brow_bulge", label: "Brow bulge" },
      { cue: "eye_squeeze", label: "Eye squeeze" },
      { cue: "nasolabial_furrow", label: "Nasolabial furrow" },
      { cue: "mouth_stretch", label: "Mouth stretch" },
      { cue: "taut_tongue", label: "Taut tongue" },
      { cue: "chin_quiver", label: "Chin quiver" },
    ],
  },
  {
    title: "Posture",
    cues: [
      { cue: "legs_to_chest", label: "Legs to chest" },
      { cue: "arm_flexion", label: "Arm flexion" },
      { cue: "fist_clench", label: "Fist clench" },
      { cue: "finger_splay", label: "Finger splay" },
      { cue: "airplane_arms", label: "Airplane arms" },
      { cue: "arching_intermittent", label: "Arching (brief)" },
    ],
  },
  {
    title: "Self-regulation (reassuring)",
    cues: [
      { cue: "gaze_aversion", label: "Gaze aversion" },
      { cue: "hand_to_mouth", label: "Hand to mouth" },
      { cue: "tuck_flexed", label: "Flexed tuck" },
    ],
  },
  {
    title: "🚨 Emergency",
    cues: [
      { cue: "face_covered", label: "Face covered" },
      { cue: "seizure_like", label: "Seizure-like" },
      { cue: "sustained_arching", label: "Rigid arching" },
      { cue: "apnea_stillness", label: "Very still" },
      { cue: "dusky_color", label: "Color change" },
    ],
  },
];

// One-tap scenarios that drive the pure rules engine to each tier — the way a
// tester exercises the ladder without hand-picking cues.
const SCENARIOS: { label: string; cues: DistressCue[] }[] = [
  { label: "Overstimulated", cues: ["finger_splay", "airplane_arms", "gaze_aversion"] },
  { label: "Colic — legs to chest", cues: ["legs_to_chest", "fist_clench", "brow_bulge"] },
  { label: "Pain cry (NFCS)", cues: ["brow_bulge", "eye_squeeze", "nasolabial_furrow", "legs_to_chest"] },
  { label: "Face covered 🚨", cues: ["face_covered"] },
  { label: "Seizure-like 🚨", cues: ["seizure_like"] },
];

const LEVEL_STYLE: Record<DistressLevel, string> = {
  calm: "bg-surface-2 text-ink-2",
  fussing: "bg-surface-2 text-ink",
  stress: "bg-amber-soft text-amber",
  distress: "bg-alert-soft text-alert",
  emergency: "bg-alert-soft text-alert",
};

// The device's behavioral-distress "firmware" console: toggle the posture and
// facial cues the on-device CV would detect; the pure rules engine fuses them
// into a graded level and opens/clears/escalates alert episodes. A covered-face
// emergency also auto-rings the caregivers (onAutoCall).
export function DistressPanel({
  deviceSession,
  enabled,
  onAutoCall,
}: {
  deviceSession: DeviceSession;
  enabled: boolean;
  onAutoCall: (reason: string) => void;
}) {
  const [asleep, setAsleep] = useState(false);
  const distress = useDistressLoop({ deviceSession, enabled, asleep, onAutoCall });
  const { level } = distress.evaluation;

  return (
    <Panel title="Distress (posture + expression)">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink-2">Detected level</span>
        <span
          className={"rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] " + LEVEL_STYLE[level]}
          data-testid="distress-level"
        >
          {level}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.label}
            type="button"
            onClick={() => distress.setScenario(sc.cues)}
            className="rounded-[10px] border border-line-2 bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-ink-3"
          >
            {sc.label}
          </button>
        ))}
      </div>

      {CUE_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <span className="text-[11px] text-ink-3">{group.title}</span>
          <div className="flex flex-wrap gap-1.5">
            {group.cues.map(({ cue, label }) => {
              const on = distress.cues.includes(cue);
              return (
                <button
                  key={cue}
                  type="button"
                  onClick={() => distress.toggleCue(cue)}
                  aria-pressed={on}
                  className={
                    "rounded-[10px] border px-2.5 py-1 text-[12px] font-medium transition-colors " +
                    (on
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line-2 bg-surface text-ink-3 hover:border-ink-3")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <label className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
        Baby asleep (suppresses mild fussing)
        <input
          type="checkbox"
          checked={asleep}
          onChange={(e) => setAsleep(e.target.checked)}
          className="size-5 accent-(--primary)"
        />
      </label>

      {distress.active && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-alert-soft p-3">
          <p className="text-[13px] font-semibold text-alert">
            Alerting caregivers — {distress.active.level}
          </p>
          <button
            type="button"
            onClick={distress.clearAll}
            className="h-11 rounded-[14px] bg-alert font-semibold text-white transition-opacity hover:opacity-95"
          >
            Clear — baby settled
          </button>
        </div>
      )}

      {distress.failed && <p className="text-[12px] font-medium text-amber">Distress report failed.</p>}
      <p className="text-[11px] text-ink-3">
        Facial cues lead; posture corroborates. Cluster + duration open an episode; self-regulation cues
        never alert. A covered face is an emergency and auto-calls you.
      </p>
    </Panel>
  );
}
