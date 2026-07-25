import { useState } from "react";
import type { Session } from "../../session/session";
import { useEngagementFeed, useSavedEngagement, type EngagementItem } from "./useEngagementFeed";
import { EngagementCard } from "./EngagementCard";

const FILTERS = ["All", "Saved", "Sleep", "Feeding", "Development", "Safety"] as const;
type Filter = (typeof FILTERS)[number];

function byTopic(items: EngagementItem[], filter: Filter): EngagementItem[] {
  if (filter === "All" || filter === "Saved") return items;
  return items.filter((i) => i.topic === filter.toLowerCase());
}

// The Learn tab: an age-matched content feed with topic + Saved filters.
export function LearnView({ session, babyId }: { session: Session; babyId?: string }) {
  const [filter, setFilter] = useState<Filter>("All");
  const feed = useEngagementFeed(session, babyId);
  const saved = useSavedEngagement(session, filter === "Saved");

  const items =
    filter === "Saved" ? (saved.data?.items ?? []) : byTopic(feed.data?.items ?? [], filter);
  const loading = filter === "Saved" ? saved.isLoading : feed.isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={
              "shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors " +
              (filter === f
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-2 bg-surface text-ink-2 hover:border-ink-3")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-ink-3">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-[18px] text-[13px] text-ink-2">
          {filter === "Saved" ? "No saved cards yet — tap ☆ Save on a card." : "No cards here yet."}
        </p>
      ) : (
        items.map((item) => <EngagementCard key={item.id} item={item} session={session} />)
      )}
    </div>
  );
}
