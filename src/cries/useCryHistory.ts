import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

// One past (or ongoing) Cry Episode from GET /babies/{id}/cries — newest first.
export interface CryHistoryItem {
  episodeId: string;
  cryType: string;
  at: string;
  state: "crying" | "calm";
  endedAt?: string;
}

export function useCryHistory(session: Session, babyId: string | undefined) {
  const { data, isLoading } = useBabyResource<CryHistoryItem[]>(session, babyId, "cries");
  return { episodes: data ?? [], isLoading };
}
