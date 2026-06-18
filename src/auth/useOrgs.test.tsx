import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "../test/server";
import { QueryWrapper } from "../test/query";
import { createSession } from "../session/session";
import { useOrgs } from "./useOrgs";

const BASE = "https://api.test";

describe("useOrgs", () => {
  test("loads the orgs the caller belongs to", async () => {
    server.use(
      http.get(`${BASE}/me/orgs`, () =>
        HttpResponse.json([{ id: "org_a", name: "Acme Baby" }, { id: "org_b", name: "Nestlings" }]),
      ),
    );

    const { result } = renderHook(() => useOrgs(createSession({ baseUrl: BASE })), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.orgs).toHaveLength(2));
    expect(result.current.orgs[1]).toEqual({ id: "org_b", name: "Nestlings" });
  });
});
