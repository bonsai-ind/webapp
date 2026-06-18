import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { deviceShareHandlers, type ShareStore } from "../mock-api/device-share";
import { ShareDeviceDialog } from "./ShareDeviceDialog";

const BASE = "https://api.test";

// A logged-in parent (primary on dev_1), composed from the real Session + the real
// device-share mock API. The store maps the parent's access token to their identity.
async function loggedInParent(store: ShareStore) {
  server.use(
    http.post(`${BASE}/auth/login`, () =>
      HttpResponse.json({ access_token: "access-parent", refresh_token: "refresh-parent" }),
    ),
    http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_parent" })),
    ...deviceShareHandlers(store),
  );
  const session = createSession({ baseUrl: BASE });
  await session.login("parent@example.com", "pw");
  return session;
}

function parentStore(): ShareStore {
  return {
    memberships: [{ deviceId: "dev_1", userId: "usr_parent", role: "primary" }],
    tokens: { "access-parent": "usr_parent" },
  };
}

describe("ShareDeviceDialog", () => {
  test("shows the share code after a successful share", async () => {
    const session = await loggedInParent(parentStore());
    render(<ShareDeviceDialog session={session} deviceId="dev_1" />);

    await userEvent.type(screen.getByLabelText(/email/i), "nanny@example.com");
    await userEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText(/share-1/)).toBeInTheDocument();
  });

  test("shows an error and no code when the share is rejected", async () => {
    // Logged-in user is only a guest on dev_1 → the endpoint returns 403.
    const session = await loggedInParent({
      memberships: [{ deviceId: "dev_1", userId: "usr_parent", role: "guest" }],
      tokens: { "access-parent": "usr_parent" },
    });
    render(<ShareDeviceDialog session={session} deviceId="dev_1" />);

    await userEvent.type(screen.getByLabelText(/email/i), "nanny@example.com");
    await userEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/share code/i)).not.toBeInTheDocument();
  });

  test("disables the share button until an email is entered", async () => {
    const session = await loggedInParent(parentStore());
    render(<ShareDeviceDialog session={session} deviceId="dev_1" />);

    expect(screen.getByRole("button", { name: /share/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/email/i), "nanny@example.com");

    expect(screen.getByRole("button", { name: /share/i })).toBeEnabled();
  });
});
