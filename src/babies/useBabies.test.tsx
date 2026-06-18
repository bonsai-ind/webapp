import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "../test/server";
import { QueryWrapper } from "../test/query";
import { createSession } from "../session/session";
import { useBabies } from "./useBabies";

const BASE = "https://api.test";

describe("useBabies", () => {
  test("loads the babies the user can see", async () => {
    server.use(
      http.get(`${BASE}/babies`, () =>
        HttpResponse.json([
          { id: "baby_1", name: "Mia" },
          { id: "baby_2", name: "Leo" },
        ]),
      ),
    );

    const session = createSession({ baseUrl: BASE });
    const { result } = renderHook(() => useBabies(session), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.babies).toEqual([
      { id: "baby_1", name: "Mia" },
      { id: "baby_2", name: "Leo" },
    ]);
  });
});
