import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { postJson } from "../api/get-json";

export interface LogGrowthBody {
  takenAt?: string;
  weightKg?: number;
  lengthCm?: number;
  headCircumferenceCm?: number;
}

// POST a caregiver-entered measurement (at least one metric).
export function logGrowth(session: Session, babyId: string, body: LogGrowthBody): Promise<{ id: string }> {
  return postJson<{ id: string }>(session, `/babies/${babyId}/growth`, body);
}

// Mutation that logs a measurement and refreshes the Growth chart.
export function useLogGrowth(session: Session, babyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LogGrowthBody) => {
      if (!babyId) return Promise.reject(new Error("no baby"));
      return logGrowth(session, babyId, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth", babyId] }),
  });
}
