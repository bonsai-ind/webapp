import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { AcceptInviteScreen } from "./AcceptInviteScreen";

const BASE = "https://api.test";

describe("AcceptInviteScreen", () => {
  test("submitting a password accepts the invite and calls onAccepted", async () => {
    server.use(
      http.post(`${BASE}/auth/accept-invite`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_new" })),
    );

    const onAccepted = vi.fn();
    render(
      <AcceptInviteScreen
        session={createSession({ baseUrl: BASE })}
        token="invite-tok"
        onAccepted={onAccepted}
      />,
    );

    await userEvent.type(screen.getByLabelText(/password/i), "chosen-pw");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
  });

  test("shows an error and does not proceed when the invite is invalid", async () => {
    server.use(
      http.post(`${BASE}/auth/accept-invite`, () => new HttpResponse("invalid", { status: 401 })),
    );

    const onAccepted = vi.fn();
    render(
      <AcceptInviteScreen
        session={createSession({ baseUrl: BASE })}
        token="expired-tok"
        onAccepted={onAccepted}
      />,
    );

    await userEvent.type(screen.getByLabelText(/password/i), "chosen-pw");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onAccepted).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  test("offers a path back to sign in after a failed invite", async () => {
    server.use(
      http.post(`${BASE}/auth/accept-invite`, () => new HttpResponse("invalid", { status: 401 })),
    );
    const onBackToLogin = vi.fn();
    render(
      <AcceptInviteScreen
        session={createSession({ baseUrl: BASE })}
        token="expired-tok"
        onAccepted={() => {}}
        onBackToLogin={onBackToLogin}
      />,
    );

    await userEvent.type(screen.getByLabelText(/password/i), "pw");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(onBackToLogin).toHaveBeenCalledOnce();
  });
});
