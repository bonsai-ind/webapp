import { afterEach, describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { downloadFile } from "./download";
import { ApiError } from "./get-json";

const BASE = "https://api.test";

describe("downloadFile", () => {
  afterEach(() => vi.restoreAllMocks());

  test("fetches the blob and clicks a named object-URL anchor", async () => {
    server.use(
      http.get(`${BASE}/babies/bby_1/report.csv`, () =>
        HttpResponse.text("section,metric,value", { headers: { "Content-Type": "text/csv" } }),
      ),
    );
    // jsdom lacks createObjectURL — install fn spies on the static methods.
    const createURL = vi.fn(() => "blob:fake-url");
    const revokeURL = vi.fn();
    URL.createObjectURL = createURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeURL as typeof URL.revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadFile(createSession({ baseUrl: BASE }), "/babies/bby_1/report.csv", "report.csv");

    expect(createURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeURL).toHaveBeenCalledWith("blob:fake-url");
  });

  test("throws a typed ApiError on a non-2xx response", async () => {
    server.use(http.get(`${BASE}/nope.csv`, () => new HttpResponse(null, { status: 404 })));
    await expect(downloadFile(createSession({ baseUrl: BASE }), "/nope.csv", "x.csv")).rejects.toBeInstanceOf(ApiError);
  });
});
