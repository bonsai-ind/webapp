import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

export interface FeedEntry {
  id: string;
  type: "bottle" | "breast";
  time: string;      // "HH:MM"
  amount?: string;   // "120 ml"
  duration?: string; // "15 min"
}

export interface FeedingData {
  lastFeedAgo: string;    // "2h ago"
  nextFeedDue: string;    // "in 1h"
  weeklyIntake: number[]; // 7 values (ml per day, newest last)
  todayFeeds: FeedEntry[];
}

export function useFeeding(
  session: Session,
  babyId: string | undefined,
): { feeding?: FeedingData; isLoading: boolean } {
  const { data, isLoading } = useBabyResource<FeedingData>(
    session,
    babyId,
    "feedings",
  );
  return { feeding: data, isLoading };
}
