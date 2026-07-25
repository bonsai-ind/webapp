import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { deleteJson, postVoid } from "../../api/get-json";

// Learn card mutations. Each invalidates the feed + the Saved list so the tab
// badge, read state, and bookmarks stay in sync.
function refresh(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["engagement"] });
}

export async function markRead(session: Session, qc: QueryClient, contentId: string): Promise<void> {
  await postVoid(session, `/engagement/${contentId}/read`);
  refresh(qc);
}

export async function setBookmark(
  session: Session,
  qc: QueryClient,
  contentId: string,
  bookmarked: boolean,
): Promise<void> {
  if (bookmarked) await postVoid(session, `/engagement/${contentId}/bookmark`);
  else await deleteJson(session, `/engagement/${contentId}/bookmark`);
  refresh(qc);
}

// Share a card via the Web Share API, falling back to copying a link.
export async function shareItem(title: string): Promise<void> {
  const url = window.location.origin;
  try {
    if (navigator.share) {
      await navigator.share({ title, text: title, url });
      return;
    }
  } catch {
    return; // user dismissed the share sheet
  }
  try {
    await navigator.clipboard?.writeText(`${title} — ${url}`);
  } catch {
    /* clipboard unavailable — best effort */
  }
}
