// Behavioral-distress alert state (same multi-episode shape as the temperature
// reducer). The device sends only alert-tier levels: `distress`/`emergency`
// drive the red takeover (active safety event, ADR 0005), `stress` a
// non-blocking amber banner. calm/fussing never reach the viewer.

export type DistressAlertSeverity = "danger" | "warning";

export interface DistressEpisode {
  id: string;
  babyId?: string;
  babyName: string;
  level: "stress" | "distress" | "emergency";
  cues: string[];
  startedAt: number; // client receipt time
}

export interface DistressAlerts {
  episodes: DistressEpisode[];
  danger?: DistressEpisode; // most recent danger-severity episode
  warnings: DistressEpisode[];
}

export type DistressStatusEvent =
  | { kind: "alert"; episode: DistressEpisode }
  | { kind: "clear"; episodeId: string };

export const initialDistressAlerts: DistressAlerts = { episodes: [], warnings: [] };

// distress + emergency are danger-class (red takeover); stress warrants
// attention, not a takeover.
export function severity(level: string): DistressAlertSeverity {
  return level === "distress" || level === "emergency" ? "danger" : "warning";
}

// A covered-face emergency is the one that also auto-rings the caregivers — the
// overlay shows a "calling you" affordance for it.
export function isAutoCall(episode: DistressEpisode): boolean {
  return episode.level === "emergency" && episode.cues.includes("face_covered");
}

function derive(episodes: DistressEpisode[]): DistressAlerts {
  const dangers = episodes.filter((e) => severity(e.level) === "danger");
  return {
    episodes,
    danger: dangers[dangers.length - 1],
    warnings: episodes.filter((e) => severity(e.level) === "warning"),
  };
}

export function distressAlertsReducer(state: DistressAlerts, event: DistressStatusEvent): DistressAlerts {
  if (event.kind === "alert") {
    const others = state.episodes.filter((e) => e.id !== event.episode.id);
    const existing = state.episodes.find((e) => e.id === event.episode.id);
    return derive([...others, existing ? { ...event.episode, startedAt: existing.startedAt } : event.episode]);
  }
  return derive(state.episodes.filter((e) => e.id !== event.episodeId));
}

// Caregiver-facing copy per level + primary cue. Framed as an aid ("go check"),
// never a diagnosis.
export function distressAlertText(episode: DistressEpisode): { title: string; hint: string; emoji: string } {
  const name = episode.babyName;
  const has = (c: string) => episode.cues.includes(c);
  if (episode.level === "emergency") {
    if (has("face_covered"))
      return { title: `${name}'s face may be covered`, hint: "Airway may be blocked — go check now. Calling you.", emoji: "🚨" };
    if (has("seizure_like"))
      return { title: "Unusual stiff, jerking movements", hint: `Go check on ${name}; seek medical help if it continues.`, emoji: "🚨" };
    if (has("sustained_arching"))
      return { title: `${name} is rigidly arching`, hint: "A stiff, inconsolable arch can be serious — go check now.", emoji: "🚨" };
    if (has("apnea_stillness"))
      return { title: `${name} has gone very still`, hint: `Go check on ${name} and their breathing now.`, emoji: "🚨" };
    if (has("dusky_color"))
      return { title: "Possible color change", hint: `Go check on ${name}; seek emergency care for blue lips or face.`, emoji: "🚨" };
    return { title: "Possible emergency", hint: `Go check on ${name} now.`, emoji: "🚨" };
  }
  if (episode.level === "distress")
    return { title: `${name} is in distress`, hint: `Pain-face and body-guarding cues — go check on and soothe ${name}.`, emoji: "😣" };
  return { title: `${name} looks stressed`, hint: `Tension and overstimulation cues — a break may help.`, emoji: "😖" };
}
