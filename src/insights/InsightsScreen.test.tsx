import { beforeEach, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { InsightsScreen } from "./InsightsScreen";
import type { InsightsData } from "./useInsights";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });

const fixture: InsightsData = {
  range: "14d",
  ageWeeks: 30,
  ageBandLabel: "4–11 months",
  sleep: {
    avgTotalMin: 790,
    avgNightMin: 610,
    avgNapMin: 180,
    typicalTotal: { minH: 12, maxH: 16, source: "AASM/AAP" },
    bedtime: { meanMinuteOfDay: 1205, sdMin: 22, driftMinVsPriorWeek: 5 },
    wakeTime: { meanMinuteOfDay: 390, sdMin: 15, driftMinVsPriorWeek: 0 },
    consistencyFlag: false,
    onsetLatency: { avgMin: 14, coveragePct: 86 },
    nightWakings: { avgPerNight: 1.4, priorAvg: 1.1 },
    longestStretchMin: 345,
    efficiencyPct: 91,
    naps: { avgPerDay: 2.1, avgWakeWindowMin: 165, typicalWakeWindow: { minMin: 150, maxMin: 210 } },
  },
  strips: [
    {
      date: "2026-07-25",
      segments: [{ startMin: 0, endMin: 360, kind: "night" }, { startMin: 540, endMin: 630, kind: "nap" }],
      events: [{ atMin: 830, type: "cry", detail: "hunger" }],
    },
  ],
  predictions: {
    nextNap: {
      windowStart: "2026-07-25T09:10:00Z",
      windowEnd: "2026-07-25T09:40:00Z",
      napOrdinal: 1,
      basis: "blended",
      routineLeadMin: 20,
    },
    bedtimeDrift: { driftMin: 5, direction: "steady", flagged: false },
    napTransition: { currentNaps: 3, nextNaps: 2, status: "approaching", typicalAge: "6.5–7.5 months" },
    regression: { flagged: false, nearMilestoneMonths: 0, wakingsZ: 0.2, onsetZ: 0.1 },
  },
  guidance: [
    {
      id: "on-track",
      tone: "reassure",
      title: "Sleep looks on track",
      body: "Totals, settling, and wakings all sit in the typical range.",
      evidence: "Averaging 13.2 hours/day against a typical 12–16.",
    },
  ],
  disclaimer: "Patterns, not diagnoses.",
};

describe("InsightsScreen", () => {
  beforeEach(() => {
    server.use(
      http.get(`${BASE}/babies`, () => HttpResponse.json([{ id: "bby_1", name: "Mia" }])),
      http.get(`${BASE}/babies/bby_1/insights`, () => HttpResponse.json(fixture)),
    );
  });

  test("Sleep view shows stat tiles, the age band, and the day-strip chart", async () => {
    renderWithQuery(<InsightsScreen session={session()} babyId="bby_1" />);

    expect(await screen.findByText("13h 10m")).toBeInTheDocument(); // avg sleep/day
    expect(screen.getByText(/typical for 4–11 months/i)).toBeInTheDocument();
    expect(screen.getByText(/12–16 hours/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /sleep day strips/i })).toBeInTheDocument();
    // Efficiency tile present with its value.
    expect(screen.getByRole("group", { name: /sleep efficiency/i })).toHaveTextContent("91");
  });

  test("Predict view shows the next-nap window and the nap-transition card", async () => {
    renderWithQuery(<InsightsScreen session={session()} babyId="bby_1" />);
    await screen.findByText("13h 10m");

    await userEvent.click(screen.getByRole("button", { name: "Predict" }));
    expect(screen.getByText(/likely/i)).toBeInTheDocument();
    expect(screen.getByText(/winding down 15–30 minutes before/i)).toBeInTheDocument();
    expect(screen.getByText(/weather forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/nap transition typically lands at 6.5–7.5 months/i)).toBeInTheDocument();
  });

  test("Guidance view renders the feed cards with evidence lines", async () => {
    renderWithQuery(<InsightsScreen session={session()} babyId="bby_1" />);
    await screen.findByText("13h 10m");

    await userEvent.click(screen.getByRole("button", { name: "Guidance" }));
    expect(screen.getByText("Sleep looks on track")).toBeInTheDocument();
    expect(screen.getByText(/averaging 13.2 hours\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  test("Report view offers the printable report and CSV download", async () => {
    renderWithQuery(<InsightsScreen session={session()} babyId="bby_1" />);
    await screen.findByText("13h 10m");

    await userEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByRole("button", { name: /open printable report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download csv/i })).toBeInTheDocument();
  });
});
