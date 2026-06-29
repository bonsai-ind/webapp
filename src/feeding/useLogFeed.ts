import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { logFeed, type LogFeedBody } from "./feeding-api";

// Logs a feed, then invalidates the baby's feedings query (the Feeding screen) and
// its summary query (the Today screen's feeds count, now derived from feeding_events
// per ADR 0016) so both refetch and reflect the new entry. Mirrors the notifications
// mutations (useMarkRead) — mutate + invalidate.
export function useLogFeed(session: Session, babyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LogFeedBody) => {
      if (babyId === undefined) throw new Error("no baby selected");
      return logFeed(session, babyId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedings", babyId] });
      qc.invalidateQueries({ queryKey: ["summary", babyId] });
    },
  });
}
