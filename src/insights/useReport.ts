import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";
import type { DayStrip, SleepInsights } from "./useInsights";

// TypeScript mirror of the backend's ReportResponse (messages/insights.go).

export interface ReportEvent {
  at: string;
  kind: string;
  detail?: string;
  endedAt?: string;
}

export interface ReportGrowthRow {
  takenAt: string;
  weightKg?: number;
  weightPct?: number;
  lengthCm?: number;
  lengthPct?: number;
  headCm?: number;
  headPct?: number;
}

export interface ReportData {
  generatedAt: string;
  rangeDays: number;
  baby: {
    name: string;
    dateOfBirth?: string;
    sex?: string;
    gestationalAgeWeeks?: number;
    chronologicalAge?: string;
    correctedAge?: string;
    pediatricianName?: string;
    allergies?: string;
    bloodType?: string;
  };
  sleep: SleepInsights;
  strips: DayStrip[];
  cries: {
    avgPerDay: number;
    totalMin: number;
    byType: Record<string, number>;
    wesselFlagged: boolean;
    avgSettleMin: number;
  };
  safety: { sos: ReportEvent[]; distress: ReportEvent[]; positionAlerts: ReportEvent[] };
  growth: ReportGrowthRow[];
  temperature: {
    roomMinC: number;
    roomMaxC: number;
    roomAvgC: number;
    sampleCount: number;
    alerts: ReportEvent[];
  };
  disclaimer: string;
}

// Fetched only while the printable overlay is open.
export function useReport(
  session: Session,
  babyId?: string,
  enabled = true,
): { report?: ReportData; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["report", babyId],
    enabled: enabled && babyId !== undefined,
    queryFn: () => getJson<ReportData>(session, `/babies/${babyId}/report?days=14`),
  });
  return { report: query.data, isLoading: query.isLoading };
}
