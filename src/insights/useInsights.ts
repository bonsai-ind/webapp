import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

// TypeScript mirror of the backend's InsightsResponse (messages/insights.go).
// All durations are minutes; clock stats are minute-of-day (UTC), -1 = no data.

export interface Band {
  minH: number;
  maxH: number;
  source: string;
}

export interface ClockStat {
  meanMinuteOfDay: number;
  sdMin: number;
  driftMinVsPriorWeek: number;
}

export interface SleepInsights {
  avgTotalMin: number;
  avgNightMin: number;
  avgNapMin: number;
  typicalTotal: Band;
  bedtime: ClockStat;
  wakeTime: ClockStat;
  consistencyFlag: boolean;
  onsetLatency: { avgMin: number; coveragePct: number };
  nightWakings: { avgPerNight: number; priorAvg: number };
  longestStretchMin: number;
  efficiencyPct: number; // 0 = unknown
  naps: {
    avgPerDay: number;
    avgWakeWindowMin: number;
    typicalWakeWindow: { minMin: number; maxMin: number };
  };
}

export interface StripSegment {
  startMin: number;
  endMin: number;
  kind: "night" | "nap";
}

export type StripEventType = "cry" | "temp" | "posture" | "sos" | "distress";

export interface StripEvent {
  atMin: number;
  type: StripEventType;
  detail: string;
}

export interface DayStrip {
  date: string; // YYYY-MM-DD
  segments: StripSegment[];
  events: StripEvent[];
}

export interface NextNap {
  windowStart: string; // RFC3339
  windowEnd: string;
  napOrdinal: number;
  basis: "age" | "blended" | "due";
  routineLeadMin: number;
}

export interface Predictions {
  nextNap: NextNap | null;
  bedtimeDrift: { driftMin: number; direction: string; flagged: boolean };
  napTransition: { currentNaps: number; nextNaps: number; status: string; typicalAge: string };
  regression: { flagged: boolean; nearMilestoneMonths: number; wakingsZ: number; onsetZ: number };
}

export type GuidanceTone = "reassure" | "tip" | "watch";

export interface GuidanceCard {
  id: string;
  tone: GuidanceTone;
  title: string;
  body: string;
  evidence: string;
}

export interface InsightsData {
  range: string;
  ageWeeks?: number;
  ageBandLabel: string;
  sleep: SleepInsights;
  strips: DayStrip[];
  predictions: Predictions;
  guidance: GuidanceCard[];
  disclaimer: string;
}

export type InsightsRange = "7d" | "14d" | "30d";

// One rich query feeds Sleep, Predict and Guidance views; the range lives in
// the key so each window caches separately (same pattern as useSleep).
export function useInsights(
  session: Session,
  babyId?: string,
  range: InsightsRange = "14d",
): { insights?: InsightsData; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["insights", babyId, range],
    enabled: babyId !== undefined,
    queryFn: () => getJson<InsightsData>(session, `/babies/${babyId}/insights?range=${range}`),
  });
  return { insights: query.data, isLoading: query.isLoading };
}

// Renders a minute-of-day as a friendly clock time ("8:05 pm"); "—" for no data.
export function clockLabel(minuteOfDay: number): string {
  if (minuteOfDay < 0) return "—";
  const h24 = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Renders minutes as "11h 20m" (or "45m" under an hour).
export function hoursLabel(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
