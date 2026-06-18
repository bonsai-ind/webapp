import { beforeEach, describe, expect, test, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { App } from "./App";

const BASE = "https://api.test";

const DEV_BRAND = {
  sellerId: "slr_dev",
  hostname: "localhost",
  name: "Bonsai Dev",
  logoUrl: "",
  primaryColor: "#6C5CE7",
};

describe("App", () => {
  beforeEach(() => {
    // Brand resolves by default; the unknown-host test overrides with 404.
    server.use(http.get(`${BASE}/brand`, () => HttpResponse.json(DEV_BRAND)));
    server.use(http.get(`${BASE}/me/orgs`, () => HttpResponse.json([])));
  });
  afterEach(() => document.documentElement.removeAttribute("style"));

  test("on a registered host, a logged-out visitor sees the sign-in form", async () => {
    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("after a successful login, the app shell appears", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
      http.get(`${BASE}/babies`, () => HttpResponse.json([{ id: "baby_1", name: "Mia" }])),
      http.get(`${BASE}/babies/:id/summary`, () => HttpResponse.json({ sleep: "13h", cryEpisodes: 0, feeds: 0 })),
    );

    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    await userEvent.type(await screen.findByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pw");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("tab", { name: "Today" })).toBeInTheDocument();
  });

  test("signing out from the shell returns to the sign-in form", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1" })),
      http.get(`${BASE}/babies`, () => HttpResponse.json([{ id: "baby_1", name: "Mia" }])),
      http.get(`${BASE}/babies/:id/summary`, () => HttpResponse.json({ sleep: "13h", cryEpisodes: 0, feeds: 0 })),
      http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    );

    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    await userEvent.type(await screen.findByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pw");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await screen.findByRole("tab", { name: "Today" });

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Today" })).not.toBeInTheDocument();
  });

  test("with an invite token, shows the create-account screen instead of sign-in", async () => {
    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} inviteToken="invite-tok" />);

    expect(await screen.findByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });

  test("after accepting an invite, the app shell appears", async () => {
    server.use(
      http.post(`${BASE}/auth/accept-invite`, () =>
        HttpResponse.json({ access_token: "access-1", refresh_token: "refresh-1" }),
      ),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_new" })),
      http.get(`${BASE}/babies`, () => HttpResponse.json([{ id: "baby_1", name: "Mia" }])),
      http.get(`${BASE}/babies/:id/summary`, () => HttpResponse.json({ sleep: "13h", cryEpisodes: 0, feeds: 0 })),
    );

    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} inviteToken="invite-tok" />);

    await userEvent.type(await screen.findByLabelText(/password/i), "chosen-pw");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("tab", { name: "Today" })).toBeInTheDocument();
  });

  test("on an unknown host, shows the unknown-seller fallback and no sign-in form", async () => {
    server.use(http.get(`${BASE}/brand`, () => new HttpResponse(null, { status: 404 })));

    render(<App session={createSession({ baseUrl: BASE })} baseUrl={BASE} />);

    expect(await screen.findByText(/unknown seller/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
