import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  test("the sign-out control invokes onSignOut", async () => {
    const onSignOut = vi.fn();
    render(<AppHeader onSignOut={onSignOut} />);

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });

  // C4: the bell shows the unread count and opens the Notification Center.
  test("the bell shows the unread count when there are unread notifications", () => {
    render(<AppHeader unreadCount={3} />);
    expect(screen.getByRole("button", { name: /notifications, 3 unread/i })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("the bell shows no count badge when there are zero unread", () => {
    render(<AppHeader unreadCount={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // Still reachable, just without an unread badge.
    expect(screen.getByRole("button", { name: /^notifications$/i })).toBeInTheDocument();
  });

  test("clicking the bell opens the Notification Center", async () => {
    const onOpen = vi.fn();
    render(<AppHeader unreadCount={2} onOpenNotifications={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  test("caps the displayed count at 9+", () => {
    render(<AppHeader unreadCount={42} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  // The top-left avatar slot: photo when present, initial-on-gradient otherwise.
  // BabyAvatar owns the fallback logic; these are the AppHeader-level wiring asserts.
  test("renders the baby's photo in the header avatar when avatarUrl is set", () => {
    render(<AppHeader babyName="Saanvi" avatarUrl="https://cdn.example/saanvi.svg" />);
    expect(screen.getByRole("img", { name: "Saanvi" })).toHaveAttribute(
      "src",
      "https://cdn.example/saanvi.svg",
    );
  });

  test("renders the baby's initial when avatarUrl is empty", () => {
    render(<AppHeader babyName="Saanvi" avatarUrl="" />);
    expect(screen.queryByRole("img")).toBeNull();
    // The baby's initial appears in the header (and in the switcher dropdown if open).
    expect(screen.getAllByText("S").length).toBeGreaterThan(0);
  });
});
