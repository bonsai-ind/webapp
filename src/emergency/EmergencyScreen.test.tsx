import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { EmergencyScreen } from "./EmergencyScreen";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });
const baby = { id: "bby_1", name: "Mia", avatarUrl: "", ageWeeks: 12 };

function providers() {
  server.use(
    http.get(`${BASE}/emergency/providers`, () =>
      HttpResponse.json({
        providers: [
          { id: "a", name: "City Ambulance", category: "ambulance", phone: "+1-555-0100", description: "", address: "", region: "", hours: "24/7", is247: true },
          { id: "d", name: "Pediatric Line", category: "doctor", phone: "+1-555-0110", description: "", address: "", region: "", hours: "24/7", is247: true },
        ],
      }),
    ),
  );
}

describe("EmergencyScreen", () => {
  test("always shows the not-a-substitute safety reminder", async () => {
    providers();
    renderWithQuery(<EmergencyScreen session={session()} baby={baby} onClose={() => {}} />);
    expect(await screen.findByText(/not a substitute for emergency services/i)).toBeInTheDocument();
    expect(screen.getByText(/911 or 112/i)).toBeInTheDocument();
  });

  test("the two CTAs dial the directory numbers via tel:", async () => {
    providers();
    renderWithQuery(<EmergencyScreen session={session()} baby={baby} onClose={() => {}} />);

    const ambulance = await screen.findByRole("link", { name: /call ambulance/i });
    expect(ambulance).toHaveAttribute("href", "tel:+15550100");
    const doctor = screen.getByRole("link", { name: /talk to a doctor/i });
    expect(doctor).toHaveAttribute("href", "tel:+15550110");
  });

  test("tapping Call ambulance logs an SOS with the baby + kind", async () => {
    providers();
    let body: any = null;
    server.use(
      http.post(`${BASE}/emergency/sos`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ sosId: "sos_1" });
      }),
    );
    renderWithQuery(<EmergencyScreen session={session()} baby={baby} onClose={() => {}} />);

    await userEvent.click(await screen.findByRole("link", { name: /call ambulance/i }));
    await vi.waitFor(() => {
      expect(body?.kind).toBe("ambulance");
      expect(body?.babyId).toBe("bby_1");
    });
  });

  test("renders the provider directory", async () => {
    providers();
    renderWithQuery(<EmergencyScreen session={session()} baby={baby} onClose={() => {}} />);
    expect(await screen.findByText("City Ambulance")).toBeInTheDocument();
    expect(screen.getByText("Pediatric Line")).toBeInTheDocument();
  });
});
