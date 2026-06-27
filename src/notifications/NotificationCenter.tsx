import { useEffect, useRef } from "react";
import type { Notification } from "./useNotifications";
import { formatRelativeTime } from "./relative-time";

// How far (px) the user must pull down at the top of the list to trigger a refresh.
const PULL_REFRESH_THRESHOLD = 60;

// NotificationCenter is the history list subscreen. Presentational: the AppShell
// supplies data + handlers from the hooks, so this stays trivially testable.
export function NotificationCenter({
  notifications,
  isLoading,
  isError,
  onSelect,
  onBack,
  onMarkAllRead,
  onRetry,
  hasMore = false,
  onLoadMore,
  isFetchingMore = false,
  onRefresh,
}: {
  notifications: Notification[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (id: string) => void;
  onBack?: () => void;
  onMarkAllRead?: () => void;
  onRetry?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  onRefresh?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pull = useRef<{ startY: number | null; delta: number }>({ startY: null, delta: 0 });

  // Auto-load the next page when the bottom sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onLoadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, notifications.length]);

  // Pull-to-refresh: a downward drag that starts at the top of the list refreshes.
  const onTouchStart = (e: React.TouchEvent) => {
    pull.current.startY = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
    pull.current.delta = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pull.current.startY != null) pull.current.delta = e.touches[0].clientY - pull.current.startY;
  };
  const onTouchEnd = () => {
    if (pull.current.startY != null && pull.current.delta > PULL_REFRESH_THRESHOLD) onRefresh?.();
    pull.current.startY = null;
    pull.current.delta = 0;
  };

  return (
    <section className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-[18px] py-3">
        {onBack && (
          <button type="button" aria-label="Back" onClick={onBack} className="text-ink-2">
            ‹
          </button>
        )}
        <h1 className="text-[17px] font-bold text-ink">Notifications</h1>
        <div className="ml-auto flex items-center gap-3">
          {onRefresh && (
            <button type="button" aria-label="Refresh" onClick={onRefresh} className="text-[13px] font-semibold text-ink-2">
              ↻
            </button>
          )}
          {onMarkAllRead && notifications.length > 0 && (
            <button type="button" onClick={onMarkAllRead} className="text-[13px] font-semibold text-primary">
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        data-testid="notif-scroll"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="min-h-0 flex-1 overflow-y-auto px-[18px]"
      >
        {isLoading ? (
          <div role="status" className="py-16 text-center text-ink-3">
            Loading…
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-ink-2">Couldn’t load your notifications.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-[13px] border border-line px-4 py-2 text-[13px] font-semibold text-ink"
              >
                Try again
              </button>
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-ink-3">No notifications yet.</div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(n.id)}
                    className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    {!n.read ? (
                      <span aria-label="unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    ) : (
                      <span className="mt-1.5 size-2 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[14px] ${n.read ? "font-medium text-ink-2" : "font-bold text-ink"}`}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-3">{formatRelativeTime(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{n.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {isFetchingMore && <div className="py-3 text-center text-[12px] text-ink-3">Loading more…</div>}
            {/* Bottom sentinel: auto-loads the next page when scrolled into view. */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          </>
        )}
      </div>
    </section>
  );
}
