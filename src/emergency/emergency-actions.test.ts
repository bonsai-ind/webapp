import { describe, expect, test } from "vitest";
import { mapsHref, telHref } from "./emergency-actions";

describe("emergency link helpers", () => {
  test("telHref keeps digits and a leading plus", () => {
    expect(telHref("+1-555-0100")).toBe("tel:+15550100");
    expect(telHref("(800) 222 1222")).toBe("tel:8002221222");
  });

  test("mapsHref points at the captured coordinates", () => {
    expect(mapsHref({ lat: 12.97, lng: 77.59 })).toBe("https://www.google.com/maps?q=12.97,77.59");
  });
});
