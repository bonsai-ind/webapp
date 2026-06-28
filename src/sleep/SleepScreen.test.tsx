import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { SleepScreen } from "./SleepScreen";

const BASE = "https://api.test";

const DAY_PAYLOAD = {
  goalHours: 12,
  achievedHours: 11,
  nightHours: 9,
  napHours: 2,
  wakings: 2,
  periods: [
    { startHour: 0, endHour: 6, type: "night" },
    { startHour: 13, endHour: 15, type: "nap" },
  ],
};

const WEEK_PAYLOAD = {
  goalHours: 12,
  achievedHours: 10,
  nightHours: 8,
  napHours: 2,
  wakings: 1,
  periods: [], // Week omits the 24-hour ribbon by design.
};

describe("SleepScreen", () => {
  test("Day tab shows night/naps/wakings populated from the API", async () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/sleep`, () => HttpResponse.json(DAY_PAYLOAD)),
    );

    renderWithQuery(<SleepScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    // Wait for the API data to land — the ring shows "11h" once `sleep` is populated.
    await screen.findByText("11h");

    expect(screen.getByText("9h")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // wakings
    // The empty-state em-dash should no longer be the headline.
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  test("Day-view request carries range=day in the URL", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${BASE}/babies/baby_1/sleep`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(DAY_PAYLOAD);
      }),
    );

    renderWithQuery(<SleepScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("11h");
    expect(seenUrl).toContain("range=day");
  });

  test("switching to Week refetches with range=week", async () => {
    const calls: string[] = [];
    server.use(
      http.get(`${BASE}/babies/baby_1/sleep`, ({ request }) => {
        calls.push(request.url);
        const url = new URL(request.url);
        if (url.searchParams.get("range") === "week") {
          return HttpResponse.json(WEEK_PAYLOAD);
        }
        return HttpResponse.json(DAY_PAYLOAD);
      }),
    );

    renderWithQuery(<SleepScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    // Initial Day fetch.
    await screen.findByText("11h");

    // User taps Week — separate query key + new URL.
    await userEvent.click(screen.getByRole("button", { name: /^week$/i }));

    await screen.findByText("10h");
    expect(calls.some((u) => u.includes("range=week"))).toBe(true);
  });

  test("renders only the dash fallback before data arrives", () => {
    // No msw handler registered for /sleep here — the query stays pending and
    // the screen renders its em-dash placeholders.
    server.use(
      http.get(`${BASE}/babies/baby_1/sleep`, () => HttpResponse.error()),
    );

    renderWithQuery(<SleepScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    // At least one em-dash visible (Night/Naps/Wakings + ring label all fall back).
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
