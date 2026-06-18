import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { CriesScreen } from "./CriesScreen";

const BASE = "https://api.test";

describe("CriesScreen", () => {
  test("shows the average per day and the fussiest-window callout", async () => {
    const hourly = new Array(24).fill(0);
    hourly[19] = 5;
    server.use(
      http.get(`${BASE}/babies/baby_1/cry-patterns`, () =>
        HttpResponse.json({ avgPerDay: 4, hourly }),
      ),
    );

    renderWithQuery(<CriesScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    expect(await screen.findByText(/fussiest around 19:00/i)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: /avg\/day/i })).getByText("4")).toBeInTheDocument();
  });

  test("renders the hourly distribution as a labelled bar chart", async () => {
    const hourly = new Array(24).fill(1);
    hourly[19] = 5;
    server.use(
      http.get(`${BASE}/babies/baby_1/cry-patterns`, () =>
        HttpResponse.json({ avgPerDay: 4, hourly }),
      ),
    );

    renderWithQuery(<CriesScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    expect(await screen.findByRole("img", { name: /cries by hour/i })).toBeInTheDocument();
  });
});
