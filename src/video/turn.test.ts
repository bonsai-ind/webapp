import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { fetchTurnConfig } from "./turn";

const BASE = "https://api.test";

describe("fetchTurnConfig", () => {
  test("maps the backend credentials to an RTCConfiguration", async () => {
    server.use(
      http.get(`${BASE}/turn-credentials`, () =>
        HttpResponse.json({
          urls: ["turn:turn.example:3478"],
          username: "1781:usr",
          credential: "hmac",
          ttl: 86400,
        }),
      ),
    );

    const config = await fetchTurnConfig(createSession({ baseUrl: BASE }));

    expect(config).toEqual({
      iceServers: [{ urls: ["turn:turn.example:3478"], username: "1781:usr", credential: "hmac" }],
    });
  });
});
