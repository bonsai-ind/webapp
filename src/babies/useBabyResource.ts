import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

// Shared shape for per-baby resources: GET /babies/:id/<resource>, cached under
// [resource, babyId], gated on a selected baby. Typed wrappers (useTodaySummary,
// useCryPatterns, …) delegate here.
export function useBabyResource<T>(
  session: Session,
  babyId: string | undefined,
  resource: string,
): { data?: T; isLoading: boolean } {
  const query = useQuery({
    queryKey: [resource, babyId],
    enabled: babyId !== undefined,
    queryFn: () => getJson<T>(session, `/babies/${babyId}/${resource}`),
  });
  return { data: query.data, isLoading: query.isLoading };
}
