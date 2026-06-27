import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { useNotifications, useMarkRead, useMarkAllRead } from "./useNotifications";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationDetail } from "./NotificationDetail";

// NotificationsOverlay is the container that binds the tested presentational
// list/detail subscreens to the data hooks. Mounted only while the Notification
// Center is open, so the history is fetched on demand.
export function NotificationsOverlay({
  session,
  onClose,
  onAction,
}: {
  session: Session;
  onClose: () => void;
  onAction?: (action: unknown) => void;
}) {
  const { notifications, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useNotifications(session);
  const markRead = useMarkRead(session);
  const markAllRead = useMarkAllRead(session);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();

  const selected = notifications.find((n) => n.id === selectedId);
  if (selected) {
    return (
      <NotificationDetail
        notification={selected}
        onBack={() => setSelectedId(undefined)}
        onMarkRead={(id) => markRead.mutate(id)}
        onAction={(action) => {
          onAction?.(action);
          onClose();
        }}
      />
    );
  }

  return (
    <NotificationCenter
      notifications={notifications}
      isLoading={isLoading}
      isError={isError}
      onSelect={setSelectedId}
      onBack={onClose}
      onMarkAllRead={() => markAllRead.mutate()}
      onRetry={() => qc.invalidateQueries({ queryKey: ["notifications"] })}
      hasMore={hasNextPage}
      onLoadMore={fetchNextPage}
      isFetchingMore={isFetchingNextPage}
      onRefresh={refetch}
    />
  );
}
