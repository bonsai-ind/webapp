import { describe, expect, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createDeviceSession } from "./device-session";
import { CryPanel } from "./CryPanel";

const BASE = "https://api.test";

function ds() {
  const s = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });
  s.adoptTokens("acc", "ref");
  return s;
}

describe("CryPanel", () => {
  test("a cry button opens an episode and Baby calmed closes the SAME episode", async () => {
    const reports: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${BASE}/device/cry`, async ({ request }) => {
        reports.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ episodeId: "x", alerted: true });
      }),
    );

    render(<CryPanel deviceSession={ds()} />);
    await userEvent.click(screen.getByRole("button", { name: "hungry" }));

    await screen.findByText(/Crying — likely hungry/);
    expect(reports[0]).toMatchObject({ state: "crying", cryType: "hungry" });

    await userEvent.click(screen.getByRole("button", { name: "Baby calmed" }));

    await waitFor(() => expect(reports).toHaveLength(2));
    expect(reports[1]).toMatchObject({ state: "calm", episodeId: reports[0].episodeId });
    expect(screen.getByRole("button", { name: "hungry" })).toBeInTheDocument();
  });

  test("a 429 surfaces the rate-limit note and stays idle", async () => {
    server.use(http.post(`${BASE}/device/cry`, () => new HttpResponse(null, { status: 429 })));

    render(<CryPanel deviceSession={ds()} />);
    await userEvent.click(screen.getByRole("button", { name: "tired" }));

    await screen.findByText(/Rate-limited/);
    expect(screen.getByRole("button", { name: "tired" })).toBeInTheDocument();
  });
});
