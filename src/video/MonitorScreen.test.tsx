import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { MonitorScreen } from "./MonitorScreen";

const BASE = "https://api.test";

describe("MonitorScreen", () => {
  test("shows an empty state when no device is paired to the baby", async () => {
    server.use(http.get(`${BASE}/devices`, () => HttpResponse.json([])));

    renderWithQuery(
      <MonitorScreen session={createSession({ baseUrl: BASE })} baseUrl={BASE} babyId="baby_1" />,
    );

    expect(await screen.findByText(/no monitor is paired/i)).toBeInTheDocument();
  });
});
