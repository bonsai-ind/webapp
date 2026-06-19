import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface SleepPeriod {
  startHour: number; // 0-23
  endHour: number;   // 0-48 (overnight: e.g. 22-30 = 22:00–06:00 next day)
  type: "night" | "nap";
}

export interface SleepData {
  goalHours: number;
  achievedHours: number;
  nightHours: number;
  napHours: number;
  wakings: number;
  periods: SleepPeriod[];
  insight?: string;
}

export function useSleep(
  session: Session,
  babyId?: string,
): { sleep?: SleepData; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<SleepData>(session, babyId, "sleep");
  return { sleep: data, isLoading };
}
