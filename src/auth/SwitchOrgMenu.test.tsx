import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { SwitchOrgMenu } from "./SwitchOrgMenu";

const BASE = "https://api.test";

const ORGS = [
  { id: "org_a", name: "Acme Baby" },
  { id: "org_b", name: "Nestlings" },
];

describe("SwitchOrgMenu", () => {
  test("lists the orgs and switches to the chosen one", async () => {
    let switchBody: unknown;
    server.use(
      http.post(`${BASE}/auth/switch-org`, async ({ request }) => {
        switchBody = await request.json();
        return HttpResponse.json({ access_token: "access-b" });
      }),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1", org_id: "org_b" })),
    );

    const session = createSession({ baseUrl: BASE });
    render(<SwitchOrgMenu orgs={ORGS} session={session} />);

    await userEvent.click(screen.getByRole("button", { name: "Nestlings" }));

    await waitFor(() =>
      expect(switchBody).toMatchObject({ org_id: "org_b" }),
    );
  });

  test("calls onSwitched after the switch completes", async () => {
    server.use(
      http.post(`${BASE}/auth/switch-org`, () => HttpResponse.json({ access_token: "access-b" })),
      http.get(`${BASE}/me`, () => HttpResponse.json({ user_id: "usr_1", org_id: "org_b" })),
    );

    const onSwitched = vi.fn();
    render(<SwitchOrgMenu orgs={ORGS} session={createSession({ baseUrl: BASE })} onSwitched={onSwitched} />);

    await userEvent.click(screen.getByRole("button", { name: "Nestlings" }));

    await waitFor(() => expect(onSwitched).toHaveBeenCalledOnce());
  });

  test("renders nothing when the user belongs to a single org", () => {
    const { container } = render(
      <SwitchOrgMenu orgs={[{ id: "org_a", name: "Acme Baby" }]} session={createSession({ baseUrl: BASE })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
