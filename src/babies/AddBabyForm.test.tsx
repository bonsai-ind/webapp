import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { renderWithQuery } from "../test/query";
import { createSession } from "../session/session";
import { AddBabyForm } from "./AddBabyForm";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });

describe("AddBabyForm", () => {
  test("creates a baby with the core fields and fires callbacks", async () => {
    let body: any = null;
    server.use(
      http.post(`${BASE}/babies`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "bby_1", name: "Mia", avatarUrl: "" });
      }),
    );
    const onDone = vi.fn();
    const onCreated = vi.fn();
    renderWithQuery(<AddBabyForm session={session()} onDone={onDone} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText("Name"), "Mia");
    await userEvent.click(screen.getByRole("button", { name: "Girl" }));
    await userEvent.click(screen.getByRole("button", { name: /add baby/i }));

    await vi.waitFor(() => expect(body).toEqual({ name: "Mia", sex: "female" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "bby_1" }));
  });

  test("requires a name", async () => {
    renderWithQuery(<AddBabyForm session={session()} onDone={() => {}} />);
    expect(screen.getByRole("button", { name: /add baby/i })).toBeDisabled();
  });
});
