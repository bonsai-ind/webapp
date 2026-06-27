import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationDetail } from "./NotificationDetail";
import type { Notification } from "./useNotifications";

const unread: Notification = {
  id: "ntf_2",
  type: "cry",
  title: "Mia is crying",
  body: "Likely hunger — open her cries to see the episode.",
  action: { kind: "open-cries", babyId: "bby_1" },
  read: false,
  createdAt: new Date().toISOString(),
};

describe("NotificationDetail", () => {
  test("shows the full title, body and type", () => {
    render(<NotificationDetail notification={unread} onMarkRead={vi.fn()} />);
    expect(screen.getByText("Mia is crying")).toBeInTheDocument();
    expect(screen.getByText(/open her cries/i)).toBeInTheDocument();
    expect(screen.getByText("cry")).toBeInTheDocument(); // the type badge, exact
  });

  test("marks the notification read on open", () => {
    const onMarkRead = vi.fn();
    render(<NotificationDetail notification={unread} onMarkRead={onMarkRead} />);
    expect(onMarkRead).toHaveBeenCalledWith("ntf_2");
  });

  test("does not re-mark an already-read notification", () => {
    const onMarkRead = vi.fn();
    render(<NotificationDetail notification={{ ...unread, read: true }} onMarkRead={onMarkRead} />);
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  test("offers the related action when one is present and fires it", async () => {
    const onAction = vi.fn();
    render(<NotificationDetail notification={unread} onMarkRead={vi.fn()} onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(onAction).toHaveBeenCalledWith(unread.action);
  });

  test("shows no action button when there is no action", () => {
    render(
      <NotificationDetail
        notification={{ ...unread, action: undefined }}
        onMarkRead={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /open/i })).not.toBeInTheDocument();
  });
});
