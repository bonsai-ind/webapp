import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

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

export type SleepRange = "day" | "week" | "month";

// useSleep takes the active SleepScreen tab (Day/Week/Month) as a range param
// and asks the backend to aggregate accordingly. The query key includes the
// range so each tab caches separately and refetches independently.
export function useSleep(
  session: Session,
  babyId?: string,
  range: SleepRange = "day",
): { sleep?: SleepData; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["sleep", babyId, range],
    enabled: babyId !== undefined,
    queryFn: () =>
      getJson<SleepData>(session, `/babies/${babyId}/sleep?range=${range}`),
  });
  return { sleep: query.data, isLoading: query.isLoading };
}
