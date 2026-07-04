import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { simulateCamera } from "./devices-api";

// Starts a device's Simulate Camera demo feed (ADR 0010). On success it
// invalidates the devices query so the refreshed camera-availability re-renders.
export function useSimulateCamera(session: Session) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => simulateCamera(session, deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
