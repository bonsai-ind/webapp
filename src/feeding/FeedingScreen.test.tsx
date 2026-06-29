import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { FeedingScreen } from "./FeedingScreen";

const BASE = "https://api.test";

const PAYLOAD = {
  lastFeedAgo: "2h ago",
  nextFeedDue: "in 1h",
  weeklyIntake: [600, 620, 580, 700, 640, 660, 680],
  todayFeeds: [
    { id: "fed_1", type: "bottle", time: "07:30", amount: "120 ml" },
    { id: "fed_2", type: "breast", time: "10:00", duration: "15 min" },
    { id: "fed_3", type: "bottle", time: "13:00", amount: "140 ml" },
  ],
};

describe("FeedingScreen", () => {
  test("populates Last feed + Next due from the API", async () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/feedings`, () => HttpResponse.json(PAYLOAD)),
    );

    renderWithQuery(<FeedingScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("2h ago");
    expect(screen.getByText("in 1h")).toBeInTheDocument();
  });

  test("renders today's feed timeline with mixed bottle / breast entries", async () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/feedings`, () => HttpResponse.json(PAYLOAD)),
    );

    renderWithQuery(<FeedingScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("120 ml");
    expect(screen.getByText("140 ml")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getAllByText(/Bottle feed/i).length).toBe(2);
    expect(screen.getByText(/Breastfeed/i)).toBeInTheDocument();
  });

  test("renders the 'No feeds logged today' fallback when todayFeeds is empty", async () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/feedings`, () =>
        HttpResponse.json({
          ...PAYLOAD,
          todayFeeds: [],
        }),
      ),
    );

    renderWithQuery(<FeedingScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("2h ago"); // wait for data to land
    expect(screen.getByText(/No feeds logged today/i)).toBeInTheDocument();
  });

  test("shows em-dash placeholders before data arrives", () => {
    server.use(
      http.get(`${BASE}/babies/baby_1/feedings`, () => HttpResponse.error()),
    );

    renderWithQuery(<FeedingScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  test("logs a feed via the + form, POSTs the entry, and shows it after refetch", async () => {
    let postedBody: Record<string, unknown> | null = null;
    let logged = false;
    const newRow = { id: "fed_new", type: "bottle", time: "14:00", amount: "200 ml" };
    server.use(
      http.get(`${BASE}/babies/baby_1/feedings`, () =>
        HttpResponse.json(
          logged ? { ...PAYLOAD, todayFeeds: [...PAYLOAD.todayFeeds, newRow] } : PAYLOAD,
        ),
      ),
      http.post(`${BASE}/babies/baby_1/feedings`, async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        logged = true;
        return HttpResponse.json(newRow);
      }),
    );

    const user = userEvent.setup();
    renderWithQuery(<FeedingScreen session={createSession({ baseUrl: BASE })} babyId="baby_1" />);

    await screen.findByText("2h ago"); // initial data loaded

    await user.click(screen.getByRole("button", { name: /log a feed/i }));
    await user.type(screen.getByLabelText(/amount \(ml\)/i), "200");
    await user.click(screen.getByRole("button", { name: /save feed/i }));

    // The form POSTs exactly what was entered (method + volume + an instant).
    await waitFor(() => expect(postedBody).toMatchObject({ method: "bottle", volumeMl: 200 }));
    expect(typeof postedBody!.startedAt).toBe("string");

    // onSuccess invalidates the feedings query → refetch renders the new row.
    expect(await screen.findByText("200 ml")).toBeInTheDocument();
  });
});
