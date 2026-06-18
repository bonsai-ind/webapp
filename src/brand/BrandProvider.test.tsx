import { afterEach, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import { server } from "../test/server";
import { BrandProvider, useBrand } from "./BrandProvider";

const BASE = "https://api.test";

function BrandLabel() {
  return <span>{useBrand().name}</span>;
}

function brand(overrides: Record<string, unknown> = {}) {
  return {
    sellerId: "slr_b",
    hostname: "app.nestlings.io",
    name: "Nestlings",
    logoUrl: "https://cdn/nestlings.svg",
    primaryColor: "#1FA2B0",
    ...overrides,
  };
}

describe("BrandProvider", () => {
  afterEach(() => document.documentElement.removeAttribute("style"));

  test("fetches the brand, renders children, and applies --primary", async () => {
    server.use(http.get(`${BASE}/brand`, () => HttpResponse.json(brand())));

    render(
      <BrandProvider baseUrl={BASE}>
        <BrandLabel />
      </BrandProvider>,
    );

    expect(await screen.findByText("Nestlings")).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#1FA2B0");
  });

  test("falls back to the default primary when the brand color is forbidden", async () => {
    server.use(http.get(`${BASE}/brand`, () => HttpResponse.json(brand({ primaryColor: "#E03131" }))));

    render(
      <BrandProvider baseUrl={BASE}>
        <BrandLabel />
      </BrandProvider>,
    );

    await screen.findByText("Nestlings");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#6C5CE7");
  });

  test("falls back to a default brand (app still loads) when /brand is unreachable", async () => {
    server.use(http.get(`${BASE}/brand`, () => HttpResponse.error())); // network/CORS failure

    render(
      <BrandProvider baseUrl={BASE}>
        <div>Protected content</div>
      </BrandProvider>,
    );

    // The app proceeds with the default brand rather than hanging or showing "unknown".
    expect(await screen.findByText("Protected content")).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#6C5CE7");
  });

  test("shows an unknown-seller fallback for an unregistered host (404)", async () => {
    server.use(http.get(`${BASE}/brand`, () => new HttpResponse(null, { status: 404 })));

    render(
      <BrandProvider baseUrl={BASE}>
        <div>Protected content</div>
      </BrandProvider>,
    );

    expect(await screen.findByText(/unknown seller/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
