import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  test("renders a text label for the tone, not color alone", () => {
    render(<StatusPill tone="crying" />);
    // The state must be readable, not encoded by color only (DESIGN.md a11y).
    expect(screen.getByText(/crying/i)).toBeInTheDocument();
  });
});
