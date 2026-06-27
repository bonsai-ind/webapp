import { useEffect } from "react";
import type { Notification } from "./useNotifications";
import { formatRelativeTime } from "./relative-time";

// NotificationDetail is the drill-in subscreen. Opening it marks the notification
// read (ADR 0014). The related action (if any) is an opaque structured intent the
// host interprets; an absent action simply shows no button (graceful degradation).
export function NotificationDetail({
  notification,
  onBack,
  onMarkRead,
  onAction,
}: {
  notification: Notification;
  onBack?: () => void;
  onMarkRead?: (id: string) => void;
  onAction?: (action: unknown) => void;
}) {
  useEffect(() => {
    if (!notification.read) onMarkRead?.(notification.id);
    // Mark-on-open fires once per opened notification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id]);

  return (
    <section className="flex h-full flex-col px-[18px] py-3">
      <header className="flex items-center gap-3">
        {onBack && (
          <button type="button" aria-label="Back" onClick={onBack} className="text-ink-2">
            ‹
          </button>
        )}
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
          {notification.type}
        </span>
        <span className="ml-auto text-[12px] text-ink-3">{formatRelativeTime(notification.createdAt)}</span>
      </header>

      <h1 className="mt-4 text-[20px] font-bold text-ink">{notification.title}</h1>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{notification.body}</p>

      {notification.action != null && onAction && (
        <button
          type="button"
          onClick={() => onAction(notification.action)}
          className="mt-6 self-start rounded-[13px] bg-primary px-4 py-2.5 text-[14px] font-semibold text-white"
        >
          Open
        </button>
      )}
    </section>
  );
}
