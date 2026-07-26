import { beforeEach, describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { ReportOverlay } from "./ReportOverlay";
import type { ReportData } from "./useReport";

const BASE = "https://api.test";

const fixture: ReportData = {
  generatedAt: "2026-07-26T10:00:00Z",
  rangeDays: 14,
  baby: {
    name: "Mia",
    dateOfBirth: "2025-12-20",
    sex: "female",
    gestationalAgeWeeks: 32,
    chronologicalAge: "7 mo 1 wk",
    correctedAge: "5 mo 3 wk",
    pediatricianName: "Dr Rao",
    allergies: "peanuts",
  },
  sleep: {
    avgTotalMin: 790,
    avgNightMin: 610,
    avgNapMin: 180,
    typicalTotal: { minH: 12, maxH: 16, source: "AASM/AAP" },
    bedtime: { meanMinuteOfDay: 1205, sdMin: 22, driftMinVsPriorWeek: 0 },
    wakeTime: { meanMinuteOfDay: 390, sdMin: 15, driftMinVsPriorWeek: 0 },
    consistencyFlag: false,
    onsetLatency: { avgMin: 14, coveragePct: 86 },
    nightWakings: { avgPerNight: 1.4, priorAvg: 1.1 },
    longestStretchMin: 345,
    efficiencyPct: 91,
    naps: { avgPerDay: 2.1, avgWakeWindowMin: 165, typicalWakeWindow: { minMin: 150, maxMin: 210 } },
  },
  strips: [{ date: "2026-07-25", segments: [{ startMin: 0, endMin: 360, kind: "night" }], events: [] }],
  cries: { avgPerDay: 3.2, totalMin: 410, byType: { hunger: 12 }, wesselFlagged: false, avgSettleMin: 9 },
  safety: {
    sos: [{ at: "2026-07-21T19:40:00Z", kind: "doctor", detail: "High fever reading" }],
    distress: [],
    positionAlerts: [],
  },
  growth: [{ takenAt: "2026-07-20", weightKg: 7.4, weightPct: 52.3 }],
  temperature: { roomMinC: 19.7, roomMaxC: 23.3, roomAvgC: 21.5, sampleCount: 84, alerts: [] },
  disclaimer: "Patterns, not diagnoses.",
};

describe("ReportOverlay", () => {
  beforeEach(() => {
    server.use(http.get(`${BASE}/babies/bby_1/report`, () => HttpResponse.json(fixture)));
  });

  test("renders the baby header with corrected age, summary table, and sections", async () => {
    renderWithQuery(
      <ReportOverlay session={createSession({ baseUrl: BASE })} babyId="bby_1" onClose={() => {}} />,
    );

    expect(await screen.findByText("Mia")).toBeInTheDocument();
    expect(screen.getByText(/corrected 5 mo 3 wk/)).toBeInTheDocument();
    expect(screen.getByText("Avg total sleep / 24h")).toBeInTheDocument();
    expect(screen.getByText(/does not meet the wessel colic criteria/i)).toBeInTheDocument();
    expect(screen.getByText(/19.7–23.3°C/)).toBeInTheDocument();
    expect(screen.getByText("SOS calls")).toBeInTheDocument();
    // Growth percentile rendered as P-value.
    expect(screen.getByText(/P52/)).toBeInTheDocument();
    // The overlay flags the body for print CSS.
    expect(document.body.classList.contains("print-mode")).toBe(true);
  });

  test("Print button calls window.print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderWithQuery(
      <ReportOverlay session={createSession({ baseUrl: BASE })} babyId="bby_1" onClose={() => {}} />,
    );
    await screen.findByText("Mia");

    await userEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
