import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { ApiError, getJson, shouldRetry } from "./get-json";

const BASE = "https://api.test";

describe("getJson", () => {
  test("returns the parsed body on a 200", async () => {
    server.use(http.get(`${BASE}/things`, () => HttpResponse.json([{ id: "t1" }])));

    const data = await getJson<{ id: string }[]>(createSession({ baseUrl: BASE }), "/things");

    expect(data).toEqual([{ id: "t1" }]);
  });

  test("throws an ApiError carrying the status on a non-2xx (no parse crash on a text body)", async () => {
    server.use(http.get(`${BASE}/things`, () => new HttpResponse("404 page not found", { status: 404 })));

    await expect(getJson(createSession({ baseUrl: BASE }), "/things")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
    expect(ApiError).toBeDefined();
  });
});

describe("shouldRetry", () => {
  test("does not retry a 4xx (it won't recover)", () => {
    expect(shouldRetry(0, new ApiError(404))).toBe(false);
    expect(shouldRetry(0, new ApiError(401))).toBe(false);
  });

  test("retries a 5xx / non-ApiError up to a cap", () => {
    expect(shouldRetry(0, new ApiError(503))).toBe(true);
    expect(shouldRetry(0, new Error("network"))).toBe(true);
    expect(shouldRetry(2, new ApiError(503))).toBe(false); // capped
  });
});
