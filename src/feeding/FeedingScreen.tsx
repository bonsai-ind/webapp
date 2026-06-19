import type { Session } from "../session/session";
import { useFeeding } from "./useFeeding";
import { Bars } from "../ui/Bars";
import { TimelineRow } from "../ui/TimelineRow";

const DropIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C12 2 5 9.6 5 14a7 7 0 0014 0c0-4.4-7-12-7-12z" />
  </svg>
);

const CircleIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="7" />
  </svg>
);

interface FeedingScreenProps {
  session: Session;
  babyId?: string;
}

export function FeedingScreen({ session, babyId }: FeedingScreenProps) {
  const { feeding } = useFeeding(session, babyId);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Section header row */}
      <div className="flex items-center justify-between">
        <span className="label">Today's feeds</span>
        <button
          type="button"
          aria-label="Log a feed"
          onClick={() => {}}
          className="size-10 rounded-full bg-feed text-white text-xl flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* 2-up stat cards */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-card border border-line bg-surface p-4">
          <p className="label mb-1">Last feed</p>
          <p className="num text-[23px] font-bold text-ink">
            {feeding ? feeding.lastFeedAgo : "—"}
          </p>
        </div>
        <div className="flex-1 rounded-card border border-line bg-surface p-4">
          <p className="label mb-1">Next due</p>
          <p className="num text-[23px] font-bold text-ink">
            {feeding ? feeding.nextFeedDue : "—"}
          </p>
        </div>
      </div>

      {/* 7-day intake bars */}
      {feeding ? (
        <Bars
          values={feeding.weeklyIntake}
          accent="feed"
          label="Weekly intake"
        />
      ) : (
        <Bars values={[0, 0, 0, 0, 0, 0, 0]} accent="feed" label="Weekly intake" />
      )}

      {/* Today's feeds timeline */}
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        {feeding && feeding.todayFeeds.length > 0 ? (
          feeding.todayFeeds.map((feed) => (
            <TimelineRow
              key={feed.id}
              icon={feed.type === "bottle" ? DropIcon : CircleIcon}
              title={feed.type === "bottle" ? "Bottle feed" : "Breastfeed"}
              tag={feed.amount ?? feed.duration}
              time={feed.time}
              chipBg="bg-feed-soft text-feed"
            />
          ))
        ) : (
          <p className="px-4 py-6 text-center text-[13.5px] text-ink-3">
            No feeds logged today
          </p>
        )}
      </div>
    </div>
  );
}
