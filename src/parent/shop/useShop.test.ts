import { describe, expect, test } from "vitest";
import { formatPrice } from "./useShop";

describe("formatPrice", () => {
  test("USD renders with a dollar sign and two decimals", () => {
    expect(formatPrice(1899, "USD")).toBe("$18.99");
    expect(formatPrice(0, "USD")).toBe("$0.00");
    expect(formatPrice(2998, "USD")).toBe("$29.98");
  });

  test("other currencies are amount-tagged", () => {
    expect(formatPrice(1000, "EUR")).toBe("10.00 EUR");
  });
});
