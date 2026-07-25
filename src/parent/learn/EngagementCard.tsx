import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import type { EngagementItem } from "./useEngagementFeed";
import { markRead, setBookmark, shareItem } from "./engagement-actions";
import { VideoEmbed } from "../VideoEmbed";
import { ContentImage } from "../ContentImage";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

// One Learn card: article (image + body), video (expandable embed), or tip
// (tinted box). Opening a card marks it read; the footer bookmarks or shares.
export function EngagementCard({ item, session }: { item: EngagementItem; session: Session }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const open = () => {
    setExpanded((e) => !e);
    if (!item.read) void markRead(session, qc, item.id);
  };

  return (
    <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-[18px]">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary">
          {cap(item.topic)}
        </span>
        {item.isNew && (
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-bold text-amber">New</span>
        )}
        {item.read && <span className="ml-auto text-[11px] text-ink-3">Read</span>}
      </div>

      <button type="button" onClick={open} className="text-left">
        <h3 className="text-[16px] font-bold text-ink">{item.title}</h3>
      </button>

      {item.kind === "video" ? (
        expanded ? (
          <VideoEmbed provider={item.videoProvider} videoId={item.videoId} title={item.title} />
        ) : (
          <button
            type="button"
            onClick={open}
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-primary-soft font-semibold text-primary"
          >
            ▶ Watch
          </button>
        )
      ) : (
        <>
          {item.kind === "article" && <ContentImage src={item.imageUrl} alt={item.title} />}
          <p className={`text-[13.5px] text-ink-2 ${expanded ? "" : "line-clamp-2"}`}>{item.body}</p>
        </>
      )}

      <div className="mt-1 flex items-center gap-4 text-[13px]">
        <button
          type="button"
          onClick={() => void setBookmark(session, qc, item.id, !item.bookmarked)}
          aria-pressed={item.bookmarked}
          className={"font-semibold " + (item.bookmarked ? "text-primary" : "text-ink-3")}
        >
          {item.bookmarked ? "★ Saved" : "☆ Save"}
        </button>
        <button type="button" onClick={() => void shareItem(item.title)} className="font-semibold text-ink-3">
          ↗ Share
        </button>
      </div>
    </section>
  );
}
