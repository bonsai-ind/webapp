import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { TodayScreen } from "./TodayScreen";

const BASE = "https://api.test";

describe("TodayScreen", () => {
  test("renders the Sleep / Cry episodes / Feeds tiles from the summary", async () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/summary`, () =>
        HttpResponse.json({ sleep: "13h 20m", cryEpisodes: 3, feeds: 6 }),
      ),
    );

    renderWithQuery(<TodayScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    // Wait for the fetched data to land, then check each tile shows its value.
    await screen.findByText("13h 20m");
    expect(within(screen.getByRole("group", { name: /sleep/i })).getByText("13h 20m")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: /cry episodes/i })).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: /feeds/i })).getByText("6")).toBeInTheDocument();
  });

  test("shows placeholder tiles (and makes no request) when no baby is selected", () => {
    // No /summary handler registered — if the query weren't gated on babyId this
    // would hit MSW's unhandled-request error.
    renderWithQuery(<TodayScreen session={createSession({ baseUrl: BASE })} />);

    expect(screen.getByRole("group", { name: /sleep/i })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: /feeds/i })).getByText("—")).toBeInTheDocument();
  });
});
