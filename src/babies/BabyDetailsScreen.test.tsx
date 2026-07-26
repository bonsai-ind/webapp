import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { BabyDetailsScreen } from "./BabyDetailsScreen";
import type { Baby } from "./useBabies";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });
const baby: Baby = {
  id: "bby_1",
  name: "Mia",
  avatarUrl: "",
  dateOfBirth: "2025-07-01",
  ageWeeks: 26,
  sex: "female",
  allergies: "peanuts",
  pediatricianName: "Dr Rao",
  pediatricianPhone: "+1-555-0170",
};

describe("BabyDetailsScreen", () => {
  test("renders read-only profile sections", () => {
    renderWithQuery(<BabyDetailsScreen session={session()} baby={baby} onClose={() => {}} onArchived={() => {}} />);
    expect(screen.getByText("Mia")).toBeInTheDocument();
    expect(screen.getByText("peanuts")).toBeInTheDocument();
    expect(screen.getByText("Dr Rao")).toBeInTheDocument();
    // Pediatrician phone is a tap-to-call link.
    expect(screen.getByRole("link", { name: "+1-555-0170" })).toHaveAttribute("href", "tel:+15550170");
  });

  test("Edit reveals the prefilled form and saves an update", async () => {
    let put: any = null;
    server.use(
      http.patch(`${BASE}/babies/bby_1`, async ({ request }) => {
        put = await request.json();
        return HttpResponse.json({ ...baby, name: "Mia R" });
      }),
    );
    renderWithQuery(<BabyDetailsScreen session={session()} baby={baby} onClose={() => {}} onArchived={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText("Basics")).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("Mia");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Mia R");
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await vi.waitFor(() => expect(put?.name).toBe("Mia R"));
    expect(put.allergies).toBe("peanuts"); // full-replace keeps existing fields
  });
});
