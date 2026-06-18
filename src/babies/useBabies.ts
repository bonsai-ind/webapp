import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

export interface Baby {
  id: string;
  name: string;
}

export function useBabies(session: Session): { babies: Baby[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["babies"],
    queryFn: () => getJson<Baby[]>(session, "/babies"),
  });
  return { babies: query.data ?? [], isLoading: query.isLoading };
}
