import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface CurvePoint {
  ageDays: number;
  value: number;
}
export interface GrowthCurves {
  p3: CurvePoint[];
  p15: CurvePoint[];
  p50: CurvePoint[];
  p85: CurvePoint[];
  p97: CurvePoint[];
}
export interface GrowthSeriesPoint {
  ageDays: number;
  value: number;
  percentile?: number;
  takenAt: string;
}
export interface GrowthCurrent {
  value: number;
  ageDays: number;
  percentile: number;
  z: number;
  takenAt: string;
}
export interface GrowthVelocity {
  perWeek: number;
  unit: string;
  expectedLow: number;
  expectedHigh: number;
  onTrack?: boolean;
}
export interface GrowthTracking {
  status: "tracking" | "crossed_down" | "crossed_up" | "insufficient";
  fromPct?: number;
  toPct?: number;
  text: string;
}
export interface GrowthMetric {
  metric: "weight" | "length" | "head";
  unit: string;
  label: string;
  current?: GrowthCurrent;
  series: GrowthSeriesPoint[];
  curves: GrowthCurves;
  velocity?: GrowthVelocity;
  tracking?: GrowthTracking;
}
export interface GrowthReminder {
  due: boolean;
  label: string;
}
export interface FeedingAdequacy {
  status: "on_track" | "watch" | "low" | "unknown";
  text: string;
}
export interface Milestone {
  label: string;
  done: boolean;
}
export interface Growth {
  sex?: string;
  ageWeeks?: number;
  correctedAge: boolean;
  metrics: GrowthMetric[];
  reminder: GrowthReminder;
  feedingAdequacy: FeedingAdequacy;
  milestones: Milestone[];
}

// WHO percentile growth data for a baby, cached under ["growth", babyId].
export function useGrowth(
  session: Session,
  babyId?: string,
): { growth?: Growth; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<Growth>(session, babyId, "growth");
  return { growth: data, isLoading };
}
