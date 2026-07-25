import { useQuery } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { getJson } from "../../api/get-json";
import { useBabyResource } from "../../babies/useBabyResource";

export interface EngagementItem {
  id: string;
  kind: "article" | "video" | "tip";
  topic: string;
  title: string;
  body: string;
  imageUrl: string;
  videoProvider?: string;
  videoId?: string;
  publishedAt: string;
  read: boolean;
  bookmarked: boolean;
  isNew: boolean;
}

export interface EngagementFeed {
  items: EngagementItem[];
  unreadNew: number;
}

// The age-matched Learn feed for a baby, cached under ["engagement", babyId].
export function useEngagementFeed(session: Session, babyId?: string) {
  return useBabyResource<EngagementFeed>(session, babyId, "engagement");
}

// The caller's bookmarked cards (Saved view), cached under ["engagement","saved"].
export function useSavedEngagement(session: Session, enabled: boolean) {
  const query = useQuery({
    queryKey: ["engagement", "saved"],
    enabled,
    queryFn: () => getJson<EngagementFeed>(session, "/engagement/saved"),
  });
  return { data: query.data, isLoading: query.isLoading };
}
