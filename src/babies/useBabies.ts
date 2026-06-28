import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

export interface Baby {
  id: string;
  name: string;
  // avatarUrl is always present on the wire (the device-service BabyResponse
  // marshals AvatarURL unconditionally); empty string means render the
  // gradient + first-initial fallback in <BabyAvatar />.
  avatarUrl: string;
}

export function useBabies(session: Session): { babies: Baby[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["babies"],
    queryFn: () => getJson<Baby[]>(session, "/babies"),
  });
  return { babies: query.data ?? [], isLoading: query.isLoading };
}
