import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

export interface EmergencyProvider {
  id: string;
  name: string;
  category: "ambulance" | "doctor" | "clinic" | "poison_control" | "mental_health";
  phone: string;
  description: string;
  address: string;
  region: string;
  hours: string;
  is247: boolean;
  externalUrl?: string;
}

export interface EmergencyDirectory {
  providers: EmergencyProvider[];
}

// The SOS provider directory, cached under ["emergency","providers"].
export function useEmergencyProviders(session: Session, enabled = true) {
  const q = useQuery({
    queryKey: ["emergency", "providers"],
    enabled,
    queryFn: () => getJson<EmergencyDirectory>(session, "/emergency/providers"),
  });
  return { providers: q.data?.providers ?? [], isLoading: q.isLoading };
}
