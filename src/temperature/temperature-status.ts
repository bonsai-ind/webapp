// Multi-episode temperature-anomaly state (same shape as the cry reducer):
// every open anomaly is tracked; `danger` episodes drive the red takeover
// (active safety event, ADR 0005), `warning` ones a non-blocking amber banner.

export type TemperatureAlertSeverity = "danger" | "warning";

export interface TemperatureEpisode {
  id: string;
  babyId?: string;
  babyName: string;
  sensor: "room" | "body";
  kind: string;
  celsius: number;
  startedAt: number; // client receipt time
}

export interface TemperatureAlerts {
  episodes: TemperatureEpisode[];
  danger?: TemperatureEpisode; // most recent danger-severity episode
  warnings: TemperatureEpisode[];
}

export type TemperatureStatusEvent =
  | { kind: "alert"; episode: TemperatureEpisode }
  | { kind: "clear"; episodeId: string };

export const initialTemperatureAlerts: TemperatureAlerts = { episodes: [], warnings: [] };

// Overheating, rapid rise, fever and hypothermia are danger-class (red
// takeover — same class as a cry/prone alert); a cold room or a flaky sensor
// warrants attention, not a takeover.
export function severity(kind: string): TemperatureAlertSeverity {
  switch (kind) {
    case "too_hot":
    case "rapid_rise":
    case "fever":
    case "hypothermia":
      return "danger";
    default:
      return "warning";
  }
}

function derive(episodes: TemperatureEpisode[]): TemperatureAlerts {
  const dangers = episodes.filter((e) => severity(e.kind) === "danger");
  return {
    episodes,
    danger: dangers[dangers.length - 1],
    warnings: episodes.filter((e) => severity(e.kind) === "warning"),
  };
}

export function temperatureAlertsReducer(state: TemperatureAlerts, event: TemperatureStatusEvent): TemperatureAlerts {
  if (event.kind === "alert") {
    const others = state.episodes.filter((e) => e.id !== event.episode.id);
    const existing = state.episodes.find((e) => e.id === event.episode.id);
    return derive([...others, existing ? { ...event.episode, startedAt: existing.startedAt } : event.episode]);
  }
  return derive(state.episodes.filter((e) => e.id !== event.episodeId));
}

// Caregiver-facing label per anomaly kind.
export function temperatureAlertText(episode: TemperatureEpisode): { title: string; hint: string } {
  const c = `${episode.celsius.toFixed(1)}°C`;
  switch (episode.kind) {
    case "too_hot":
      return { title: `Nursery too hot (${c})`, hint: "Overheating raises SIDS risk — aim for 20–22°C." };
    case "too_cold":
      return { title: `Nursery too cold (${c})`, hint: "Below the safe range — aim for 20–22°C." };
    case "rapid_rise":
      return { title: `Room heating up fast (${c})`, hint: "Check the heater and the room." };
    case "fever":
      return { title: `Possible fever (${c})`, hint: `Check on ${episode.babyName}; seek care if under 3 months.` };
    case "hypothermia":
      return { title: `Low body temperature (${c})`, hint: `Warm ${episode.babyName} and check on them.` };
    case "sensor_fault":
      return { title: "Temperature sensor fault", hint: "The reading looks implausible." };
    default:
      return { title: `Temperature alert (${c})`, hint: `Check on ${episode.babyName}.` };
  }
}
