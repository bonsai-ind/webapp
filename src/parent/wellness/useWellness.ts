import type { Session } from "../../session/session";
import { useBabyResource } from "../../babies/useBabyResource";

export interface WellnessSessionItem {
  id: string;
  idx: number;
  title: string;
  kind: "article" | "video";
  body: string;
  imageUrl: string;
  videoProvider?: string;
  videoId?: string;
  completed: boolean;
}

export interface WellnessProgram {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  imageUrl: string;
  sessionCount: number;
  enrolled: boolean;
  completedCount: number;
  sessions: WellnessSessionItem[];
}

export interface WellnessData {
  programs: WellnessProgram[];
}

// Maternal programs matched to the baby's postpartum stage + the caller's
// progress, cached under ["wellness", babyId].
export function useWellness(session: Session, babyId?: string) {
  return useBabyResource<WellnessData>(session, babyId, "wellness");
}
