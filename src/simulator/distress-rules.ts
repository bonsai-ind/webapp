// Device-side behavioral-distress rules — THE FIRMWARE CONTRACT. The device
// owns the boundary (like cry/position/temperature): it fuses camera-observable
// posture + facial micro-expression cues into a graded distress level and
// opens/closes alert episodes; the backend only stores and relays.
//
// Research basis (NFCS, PIPP, NIPS, FLACC pain scales; NIDCAP/Als synactive
// stress-vs-self-regulation cues; AAP safe-sleep; opisthotonus/seizure/apnea
// red-flags). The load-bearing principles, encoded below:
//   - Facial is the PRIMARY channel (NFCS core = brow bulge + eye squeeze +
//     nasolabial furrow); posture corroborates.
//   - Flexor limb movements (legs-to-chest, arm flexion) lean PAIN; extensor
//     movements (finger splay, airplane, arching) lean OVERSTIMULATION/stress.
//   - Cluster over single-cue, with a duration/persistence gate — never alert
//     above mild on one cue.
//   - Self-regulation cues (gaze aversion, hand-to-mouth, flexed tuck) are
//     coping, NOT distress — they never raise the level.
//   - A sleeping baby's minor cues are suppressed at the mild tier (never at
//     the emergency tier).

export type DistressLevel = "calm" | "fussing" | "stress" | "distress" | "emergency";

// Alert-tier levels open an episode that fans out to caregivers; calm/fussing
// do not (fussing is normal and consolable — recording it would be the exact
// over-alerting the research warns against).
export type AlertLevel = "stress" | "distress" | "emergency";

export type DistressCue =
  // Facial (NFCS) — core cluster, highest weight.
  | "brow_bulge"
  | "eye_squeeze"
  | "nasolabial_furrow"
  // Facial (NFCS) — medium weight.
  | "mouth_stretch"
  | "taut_tongue"
  | "chin_quiver"
  // Posture — flexor / pain-leaning.
  | "legs_to_chest"
  | "arm_flexion"
  | "fist_clench"
  // Posture — extensor / overstimulation-leaning (stress).
  | "finger_splay"
  | "airplane_arms"
  | "arching_intermittent"
  // Self-regulation — reassuring; NEVER raises the level.
  | "gaze_aversion"
  | "hand_to_mouth"
  | "tuck_flexed"
  // Emergency red-flags.
  | "face_covered"
  | "seizure_like"
  | "sustained_arching"
  | "apnea_stillness"
  | "dusky_color";

export const FACIAL_CORE: DistressCue[] = ["brow_bulge", "eye_squeeze", "nasolabial_furrow"];
export const FACIAL_MEDIUM: DistressCue[] = ["mouth_stretch", "taut_tongue", "chin_quiver"];
export const FLEXOR: DistressCue[] = ["legs_to_chest", "arm_flexion", "fist_clench"];
export const EXTENSOR: DistressCue[] = ["finger_splay", "airplane_arms", "arching_intermittent"];
export const SELF_REG: DistressCue[] = ["gaze_aversion", "hand_to_mouth", "tuck_flexed"];
export const EMERGENCY: DistressCue[] = [
  "face_covered",
  "seizure_like",
  "sustained_arching",
  "apnea_stillness",
  "dusky_color",
];

// Only a covered airway auto-rings the caregivers (user choice). The other
// emergency cues still raise a red takeover + push, but do not auto-call.
export const AUTO_CALL_CUES: DistressCue[] = ["face_covered"];

// Ticks a non-emergency state must persist before it escalates one tier
// (inconsolability — the feature that separates distress from ordinary fuss).
export const SUSTAIN_ESCALATE_TICKS = 2;

// Priority order for choosing the "primary" cue that drives the caregiver copy.
const CUE_PRIORITY: DistressCue[] = [
  "face_covered",
  "seizure_like",
  "sustained_arching",
  "apnea_stillness",
  "dusky_color",
  "brow_bulge",
  "eye_squeeze",
  "nasolabial_furrow",
  "legs_to_chest",
  "arm_flexion",
  "arching_intermittent",
  "finger_splay",
  "airplane_arms",
  "mouth_stretch",
  "taut_tongue",
  "chin_quiver",
  "fist_clench",
];

export interface DistressEvaluation {
  level: DistressLevel;
  autoCall: boolean;
  primaryCue?: DistressCue;
  cues: DistressCue[];
}

const countIn = (set: DistressCue[], cues: Set<DistressCue>) => set.filter((c) => cues.has(c)).length;

// evaluate fuses the currently-observed cues into a graded distress level. Pure
// — trivially portable to firmware. `sustainedTicks` is how many consecutive
// ticks the same non-emergency concern has held (drives the inconsolability
// escalation); `asleep` gates the mild tier.
export function evaluate(
  cues: DistressCue[],
  opts: { asleep?: boolean; sustainedTicks?: number } = {},
): DistressEvaluation {
  const present = new Set(cues);
  const sustainedTicks = opts.sustainedTicks ?? 0;

  // Emergency short-circuits everything — a red-flag cue is the level.
  const emergencyCues = EMERGENCY.filter((c) => present.has(c));
  if (emergencyCues.length > 0) {
    return {
      level: "emergency",
      autoCall: AUTO_CALL_CUES.some((c) => present.has(c)),
      primaryCue: pickPrimary(cues),
      cues,
    };
  }

  const core = countIn(FACIAL_CORE, present);
  const facial = core + countIn(FACIAL_MEDIUM, present);
  const flexor = countIn(FLEXOR, present);
  const extensor = countIn(EXTENSOR, present);
  const concern = facial + flexor + extensor; // self-regulation cues excluded

  let level: DistressLevel;
  if (core >= 2 && flexor >= 1) {
    // NFCS pain-face cluster + body-guarding — probable pain (research L3).
    level = "distress";
  } else if (concern >= 2) {
    level = "stress";
  } else if (concern === 1) {
    level = "fussing";
  } else {
    level = "calm";
  }

  // Inconsolability: a mild/moderate state that persists escalates one tier.
  if (sustainedTicks >= SUSTAIN_ESCALATE_TICKS) {
    if (level === "fussing") level = "stress";
    else if (level === "stress") level = "distress";
  }

  // A sleeping baby's minor cues are not worth a nudge (PIPP state-gating);
  // never suppresses stress+ or emergency.
  if (opts.asleep && level === "fussing") level = "calm";

  return { level, autoCall: false, primaryCue: pickPrimary(cues), cues };
}

function pickPrimary(cues: DistressCue[]): DistressCue | undefined {
  const present = new Set(cues);
  return CUE_PRIORITY.find((c) => present.has(c)) ?? cues[0];
}

// alertLevelOf returns the episode-tier level for a graded level, or null when
// no episode should open (calm/fussing are card-only, never alerts).
export function alertLevelOf(level: DistressLevel): AlertLevel | null {
  return level === "stress" || level === "distress" || level === "emergency" ? level : null;
}

export type EpisodeAction =
  | { kind: "none" }
  | { kind: "clear" } // an active episode should close (level fell to calm/fussing)
  | { kind: "set"; level: AlertLevel }; // open a fresh episode (first alert OR a level change)

// decide turns the current active episode + the newly-evaluated level into an
// episode action. A level CHANGE closes the old episode and opens a new one
// (fresh episodeId) so each step re-notifies — the device owns the boundary and
// mints the ids.
export function decide(active: { level: AlertLevel } | null, level: DistressLevel): EpisodeAction {
  const target = alertLevelOf(level);
  if (target === null) return active ? { kind: "clear" } : { kind: "none" };
  if (!active || active.level !== target) return { kind: "set", level: target };
  return { kind: "none" };
}
