import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface GrowthPoint {
  ageWeeks: number;
  kg: number;
}

export interface Milestone {
  label: string;
  done: boolean;
}

export interface Growth {
  weightKg: number;
  weightPercentile: number;
  series: GrowthPoint[];
  milestones: Milestone[];
}

export function useGrowth(
  session: Session,
  babyId?: string,
): { growth?: Growth; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<Growth>(session, babyId, "growth");
  return { growth: data, isLoading };
}
