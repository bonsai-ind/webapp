import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { GrowthScreen } from "./GrowthScreen";

const BASE = "https://api.test";

const curve = (base: number) => [
  { ageDays: 0, value: base },
  { ageDays: 90, value: base + 3 },
  { ageDays: 180, value: base + 5 },
];
const metric = (m: string, unit: string, label: string, value: number) => ({
  metric: m,
  unit,
  label,
  current: { value, ageDays: 182, percentile: 55, z: 0.1, takenAt: "2026-01-01T00:00:00Z" },
  series: [
    { ageDays: 0, value: value - 4, percentile: 50, takenAt: "2025-07-01T00:00:00Z" },
    { ageDays: 182, value, percentile: 55, takenAt: "2026-01-01T00:00:00Z" },
  ],
  curves: { p3: curve(value - 5), p15: curve(value - 4), p50: curve(value - 3), p85: curve(value - 2), p97: curve(value - 1) },
  velocity: { perWeek: 0.12, unit: `${unit}/wk`, expectedLow: 0.06, expectedHigh: 0.1, onTrack: true },
  tracking: { status: "tracking", text: `Tracking steadily around the 55th percentile.` },
});

const GROWTH = {
  correctedAge: false,
  sex: "female",
  ageWeeks: 26,
  metrics: [metric("weight", "kg", "Weight", 7.3), metric("length", "cm", "Length", 66), metric("head", "cm", "Head circumference", 42.2)],
  reminder: { due: false, label: "Measurements up to date" },
  feedingAdequacy: { status: "on_track", text: "Feeding looks on track — about 7 feeds a day." },
  milestones: [
    { label: "Rolls over", done: true },
    { label: "Sits unaided", done: false },
  ],
};

function serve() {
  server.use(http.get(`${BASE}/babies/baby_1/growth`, () => HttpResponse.json(GROWTH)));
}

describe("GrowthScreen", () => {
  test("shows the current weight, percentile and tracking status", async () => {
    serve();
    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);
    await screen.findByText("7.3");
    expect(screen.getByText(/55th pct/i)).toBeInTheDocument();
    expect(screen.getByText(/tracking steadily/i)).toBeInTheDocument();
  });

  test("renders the WHO percentile chart", async () => {
    serve();
    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);
    expect(await screen.findByRole("img", { name: /weight for age percentile/i })).toBeInTheDocument();
  });

  test("the metric switcher shows the length chart", async () => {
    serve();
    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);
    await screen.findByText("7.3");
    await userEvent.click(screen.getByRole("button", { name: "Length" }));
    expect(await screen.findByRole("img", { name: /length for age percentile/i })).toBeInTheDocument();
  });

  test("shows the feeding-adequacy card and milestones", async () => {
    serve();
    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);
    expect(await screen.findByText(/feeding looks on track/i)).toBeInTheDocument();
    expect(screen.getByText("Rolls over").closest("li")).toHaveTextContent("Rolls over");
  });
});
