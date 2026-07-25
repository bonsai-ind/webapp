import { beforeEach, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { createLiveSync, type StreamEvent, type StreamFactory } from "../realtime/live-sync";
import { AppShell } from "./AppShell";

const BASE = "https://api.test";

function fakeFactory() {
  let emit: (e: StreamEvent) => void = () => {};
  const factory: StreamFactory = {
    open(opts) {
      emit = opts.onEvent;
      return { close() {} };
    },
  };
  return { factory, emit: (e: StreamEvent) => emit(e) };
}

// AppShell loads babies for the header; default the endpoint to empty so tab
// tests don't depend on baby data. Baby-specific tests override it.
function renderShell() {
  server.use(http.get(`${BASE}/babies`, () => HttpResponse.json([])));
  return renderWithQuery(<AppShell session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);
}

describe("AppShell", () => {
  // The Today panel renders TodayScreen, which fetches a per-baby summary when a
  // baby is active — give it a default so tab/header tests don't 500 on it.
  beforeEach(() => {
    server.use(
      http.get(`${BASE}/babies/:id/summary`, () =>
        HttpResponse.json({ sleep: "—", cryEpisodes: 0, feeds: 0 }),
      ),
      http.get(`${BASE}/me/orgs`, () => HttpResponse.json([])),
      // The Care-tab badge reads the Learn feed — default it so tab/header tests
      // don't hit an unhandled request.
      http.get(`${BASE}/babies/:id/engagement`, () => HttpResponse.json({ items: [], unreadNew: 0 })),
    );
  });

  test("renders the five tabs with Today active and its panel shown", () => {
    renderShell();

    for (const label of ["Today", "Monitor", "Cries", "Growth", "Care"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }

    expect(screen.getByRole("tab", { name: "Today", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Today" })).toBeInTheDocument();
  });

  test("switching to a tab shows its panel and deselects the previous one", async () => {
    renderShell();

    await userEvent.click(screen.getByRole("tab", { name: "Cries" }));

    expect(screen.getByRole("tab", { name: "Cries", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Today", selected: false })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Cries" })).toBeInTheDocument();
    expect(screen.queryByRole("tabpanel", { name: "Today" })).not.toBeInTheDocument();
  });

  test("the header shows the first baby's name loaded from the API", async () => {
    server.use(
      http.get(`${BASE}/babies`, () =>
        HttpResponse.json([
          { id: "baby_1", name: "Ava" },
          { id: "baby_2", name: "Leo" },
        ]),
      ),
    );
    renderWithQuery(<AppShell session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    expect(await screen.findByText("Ava")).toBeInTheDocument();
  });

  test("switching baby via the header updates the active baby", async () => {
    server.use(
      http.get(`${BASE}/babies`, () =>
        HttpResponse.json([
          { id: "baby_1", name: "Ava" },
          { id: "baby_2", name: "Leo" },
        ]),
      ),
    );
    renderWithQuery(<AppShell session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    await screen.findByText("Ava");
    await userEvent.click(screen.getByRole("button", { name: /switch baby/i }));
    await userEvent.click(screen.getByRole("button", { name: "Leo" }));

    expect(screen.getByRole("button", { name: /switch baby/i })).toHaveTextContent("Leo");
  });

  test("mounts the safety overlay: a safety-status alert shows the banner", () => {
    server.use(http.get(`${BASE}/babies`, () => HttpResponse.json([])));
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });
    renderWithQuery(
      <AppShell session={createSession({ baseUrl: BASE })} baseUrl={BASE} liveSync={liveSync} />,
    );
    act(() => liveSync.start());

    expect(screen.queryByText(/may be unsafe/i)).not.toBeInTheDocument();
    act(() =>
      fake.emit({
        type: "safety-status",
        data: { state: "alert", posture: "face_down_or_absent", episodeId: "pos-1", babyName: "Mia" },
      }),
    );
    expect(screen.getByText(/mia may be unsafe/i)).toBeInTheDocument();
  });

  test("shows a placeholder and does not crash when there are no babies", async () => {
    server.use(http.get(`${BASE}/babies`, () => HttpResponse.json([])));
    renderWithQuery(<AppShell session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    // The shell still renders (no crash) and the switcher shows a neutral placeholder.
    expect(await screen.findByRole("tab", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch baby/i })).toHaveTextContent("—");
  });
});
