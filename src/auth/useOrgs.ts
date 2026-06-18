import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

export interface Org {
  id: string;
  name: string;
}

// The orgs the caller belongs to (GET /me/orgs) — the org-switcher's source.
export function useOrgs(session: Session): { orgs: Org[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["me", "orgs"],
    queryFn: () => getJson<Org[]>(session, "/me/orgs"),
  });
  return { orgs: query.data ?? [], isLoading: query.isLoading };
}
