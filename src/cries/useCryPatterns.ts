import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface CryPatterns {
  avgPerDay: number;
  avgSettleTimeMins?: number;
  hourly: number[];
  likelyCauses?: Array<{ label: string; value: number }>;
}

export function useCryPatterns(
  session: Session,
  babyId?: string,
): { patterns?: CryPatterns; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<CryPatterns>(session, babyId, "cry-patterns");
  return { patterns: data, isLoading };
}
