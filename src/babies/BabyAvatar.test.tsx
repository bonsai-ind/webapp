import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BabyAvatar } from "./BabyAvatar";

describe("BabyAvatar", () => {
  test("renders the baby's photo when avatarUrl is set", () => {
    render(<BabyAvatar name="Saanvi" avatarUrl="https://cdn.example/saanvi.svg" />);
    const img = screen.getByRole("img", { name: "Saanvi" });
    expect(img).toHaveAttribute("src", "https://cdn.example/saanvi.svg");
  });

  test("falls back to the first initial when avatarUrl is empty", () => {
    render(<BabyAvatar name="Saanvi" avatarUrl="" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  test("falls back to the first initial when avatarUrl is undefined", () => {
    render(<BabyAvatar name="Vivaan" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  test("falls back to the initial when the image fails to load (onError)", () => {
    render(<BabyAvatar name="Saanvi" avatarUrl="https://broken.invalid/x.svg" />);
    const img = screen.getByRole("img", { name: "Saanvi" });
    // Simulate the browser firing onError on the <img>.
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  test("uppercases the initial for lower-case names", () => {
    render(<BabyAvatar name="mia" />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  test("renders '?' when the name is blank, so the slot never goes empty", () => {
    render(<BabyAvatar name="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
