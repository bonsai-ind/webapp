import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { listDevices, type Device } from "./devices-api";

export function useDevices(session: Session): { devices: Device[]; isLoading: boolean } {
  const query = useQuery({ queryKey: ["devices"], queryFn: () => listDevices(session) });
  return { devices: query.data ?? [], isLoading: query.isLoading };
}
