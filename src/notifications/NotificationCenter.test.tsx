import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationCenter } from "./NotificationCenter";
import type { Notification } from "./useNotifications";
import { triggerIntersection } from "../test/intersection";

const items: Notification[] = [
  { id: "ntf_2", type: "cry", title: "Mia is crying", body: "Likely hunger", read: false, createdAt: new Date().toISOString() },
  { id: "ntf_1", type: "device", title: "Monitor offline", body: "Nursery Cam went offline", read: true, createdAt: new Date().toISOString() },
];

describe("NotificationCenter", () => {
  test("renders a row per notification with its title and preview", () => {
    render(<NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} />);
    expect(screen.getByText("Mia is crying")).toBeInTheDocument();
    expect(screen.getByText("Likely hunger")).toBeInTheDocument();
    expect(screen.getByText("Monitor offline")).toBeInTheDocument();
  });

  test("marks unread rows with an unread indicator, read rows without", () => {
    render(<NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} />);
    // one unread item -> exactly one unread indicator
    expect(screen.getAllByLabelText("unread")).toHaveLength(1);
  });

  test("clicking a row selects that notification", async () => {
    const onSelect = vi.fn();
    render(<NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Mia is crying/i }));
    expect(onSelect).toHaveBeenCalledWith("ntf_2");
  });

  test("shows an empty state when there are no notifications", () => {
    render(<NotificationCenter notifications={[]} isLoading={false} isError={false} onSelect={vi.fn()} />);
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  test("shows a loading state", () => {
    render(<NotificationCenter notifications={[]} isLoading={true} isError={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("shows an error state with a retry control", async () => {
    const onRetry = vi.fn();
    render(<NotificationCenter notifications={[]} isLoading={false} isError={true} onSelect={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByText(/couldn.t load|something went wrong|error/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test("mark-all-read control fires onMarkAllRead", async () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} onMarkAllRead={onMarkAllRead} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(onMarkAllRead).toHaveBeenCalledOnce();
  });
});

describe("NotificationCenter — infinite scroll & refresh", () => {
  // Slice 5: when the bottom sentinel scrolls into view and there are more pages,
  // the next page auto-loads.
  test("auto-loads the next page when the bottom scrolls into view", () => {
    const onLoadMore = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} hasMore onLoadMore={onLoadMore} />,
    );
    triggerIntersection(true);
    expect(onLoadMore).toHaveBeenCalled();
  });

  test("does not auto-load when there are no more pages", () => {
    const onLoadMore = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} hasMore={false} onLoadMore={onLoadMore} />,
    );
    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  // Slice 5: a manual refresh control re-fetches.
  test("the refresh control calls onRefresh", async () => {
    const onRefresh = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} onRefresh={onRefresh} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  // Slice 5: a pull-down gesture at the top of the list triggers a refresh.
  test("pull-to-refresh at the top of the list calls onRefresh", () => {
    const onRefresh = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} onRefresh={onRefresh} />,
    );
    const scroller = screen.getByTestId("notif-scroll");
    Object.defineProperty(scroller, "scrollTop", { value: 0, configurable: true });

    fireEvent.touchStart(scroller, { touches: [{ clientY: 20 }] });
    fireEvent.touchMove(scroller, { touches: [{ clientY: 110 }] }); // pulled down 90px
    fireEvent.touchEnd(scroller, {});

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  // A pull that starts when not scrolled to the top must NOT refresh.
  test("pull-to-refresh does nothing when not scrolled to the top", () => {
    const onRefresh = vi.fn();
    render(
      <NotificationCenter notifications={items} isLoading={false} isError={false} onSelect={vi.fn()} onRefresh={onRefresh} />,
    );
    const scroller = screen.getByTestId("notif-scroll");
    Object.defineProperty(scroller, "scrollTop", { value: 200, configurable: true });

    fireEvent.touchStart(scroller, { touches: [{ clientY: 20 }] });
    fireEvent.touchMove(scroller, { touches: [{ clientY: 110 }] });
    fireEvent.touchEnd(scroller, {});

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
