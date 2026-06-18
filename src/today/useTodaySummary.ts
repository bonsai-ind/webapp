import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface TodaySummary {
  sleep: string;
  cryEpisodes: number;
  feeds: number;
}

export function useTodaySummary(
  session: Session,
  babyId?: string,
): { summary?: TodaySummary; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<TodaySummary>(session, babyId, "summary");
  return { summary: data, isLoading };
}
