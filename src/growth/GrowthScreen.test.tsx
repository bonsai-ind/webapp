import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { GrowthScreen } from "./GrowthScreen";

const BASE = "https://api.test";

const GROWTH = {
  weightKg: 7.3,
  weightPercentile: 62,
  series: [
    { ageWeeks: 0, kg: 3.4 },
    { ageWeeks: 12, kg: 5.8 },
    { ageWeeks: 24, kg: 7.3 },
  ],
  milestones: [
    { label: "Rolls over", done: true },
    { label: "Sits unaided", done: false },
  ],
};

describe("GrowthScreen", () => {
  test("shows the current weight and percentile", async () => {
    server.use(http.get(`${BASE}/babies/baby_1/growth`, () => HttpResponse.json(GROWTH)));

    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("7.3"); // wait for the data to land
    const weight = screen.getByRole("group", { name: /weight/i });
    expect(within(weight).getByText("7.3")).toBeInTheDocument();
    expect(within(weight).getByText(/P62/)).toBeInTheDocument();
  });

  test("renders the weight-for-age line chart", async () => {
    server.use(http.get(`${BASE}/babies/baby_1/growth`, () => HttpResponse.json(GROWTH)));

    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    expect(await screen.findByRole("img", { name: /weight for age/i })).toBeInTheDocument();
  });

  test("lists milestones, marking done ones distinctly from upcoming", async () => {
    server.use(http.get(`${BASE}/babies/baby_1/growth`, () => HttpResponse.json(GROWTH)));

    renderWithQuery(<GrowthScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    const done = (await screen.findByText("Rolls over")).closest("li")!;
    expect(within(done).getByLabelText(/done/i)).toBeInTheDocument();

    const upcoming = screen.getByText("Sits unaided").closest("li")!;
    expect(within(upcoming).queryByLabelText(/done/i)).not.toBeInTheDocument();
  });
});
