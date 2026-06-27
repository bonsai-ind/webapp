import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson, postVoid } from "../api/get-json";

// Notification is the wire shape of a Notification Center item (ADR 0014).
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action?: unknown;
  read: boolean;
  createdAt: string;
}

interface ListResponse {
  items: Notification[];
  nextCursor?: string;
}

// useUnreadCount drives the header bell badge.
export function useUnreadCount(session: Session): { unread: number; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => getJson<{ unread: number }>(session, "/notifications/unread-count"),
  });
  return { unread: query.data?.unread ?? 0, isLoading: query.isLoading };
}

// useNotifications loads the newest-first history feed, paginated by cursor.
// Pages are flattened into one list; `fetchNextPage` follows the cursor for the
// next (older) page; `refetch` resets to the first page (manual / pull refresh).
export function useNotifications(session: Session): {
  notifications: Notification[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getJson<ListResponse>(
        session,
        pageParam ? `/notifications?before=${encodeURIComponent(pageParam)}` : "/notifications",
      ),
    getNextPageParam: (last) => last.nextCursor || undefined,
  });
  return {
    notifications: query.data?.pages.flatMap((p) => p.items) ?? [],
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

// useMarkRead marks a single notification read, then refreshes the feed + badge.
export function useMarkRead(session: Session) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postVoid(session, `/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// useMarkAllRead clears every unread notification for the caller.
export function useMarkAllRead(session: Session) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postVoid(session, "/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
