import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { fetchBrand } from "./fetch-brand";

const BASE = "https://api.test";

describe("fetchBrand", () => {
  test("returns the resolved seller brand (real /brand shape)", async () => {
    server.use(
      http.get(`${BASE}/brand`, () =>
        HttpResponse.json({
          sellerId: "slr_dev",
          hostname: "localhost",
          name: "Bonsai Dev",
          logoUrl: "",
          primaryColor: "#6C5CE7",
        }),
      ),
    );

    const brand = await fetchBrand(BASE);

    expect(brand).toEqual({
      sellerId: "slr_dev",
      hostname: "localhost",
      name: "Bonsai Dev",
      logoUrl: "",
      primaryColor: "#6C5CE7",
    });
  });

  test("returns null when the host is not a registered seller", async () => {
    server.use(http.get(`${BASE}/brand`, () => new HttpResponse(null, { status: 404 })));

    expect(await fetchBrand(BASE)).toBeNull();
  });
});
