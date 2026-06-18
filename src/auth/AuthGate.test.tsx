import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { AuthGate } from "./AuthGate";

const BASE = "https://api.test";

function signedInSession() {
  return createSession({ baseUrl: BASE });
}

describe("AuthGate", () => {
  test("shows the sign-in form, then reveals the protected app on valid login", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
    );

    render(
      <AuthGate session={signedInSession()}>
        <div>Today summary</div>
      </AuthGate>,
    );

    // Logged out: the protected content is hidden, the form is shown.
    expect(screen.queryByText("Today summary")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pw");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // After a successful login the protected children appear.
    expect(await screen.findByText("Today summary")).toBeInTheDocument();
  });

  test("shows an error and stays on the form when credentials are rejected", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () => new HttpResponse("unauthorized", { status: 401 })),
    );

    render(
      <AuthGate session={signedInSession()}>
        <div>Today summary</div>
      </AuthGate>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Today summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("returns to the sign-in form when the session becomes unauthenticated", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
      http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    );

    const session = signedInSession();
    render(
      <AuthGate session={session}>
        <div>Today summary</div>
      </AuthGate>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pw");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Today summary")).toBeInTheDocument();

    // Session ends out-of-band (logout, or a `revoked` event cutting the stream).
    await act(async () => {
      await session.logout();
    });

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("Today summary")).not.toBeInTheDocument();
  });
});
