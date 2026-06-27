import { useState } from "react";
import { StatusPill, type StatusTone } from "../ui/StatusPill";
import type { Baby } from "../babies/useBabies";

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOut() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * App chrome shown above the tab content: gradient baby avatar + greeting +
 * baby name (with a switcher chevron) on the left; status + notifications on the
 * right. Presentational for now — baby/status are passed in (mock until the
 * domain data layer lands), and the switcher/bell are wired in later slices.
 */
export function AppHeader({
  greeting = "Good evening",
  babyName = "—",
  babies = [],
  onSelectBaby,
  status = "calm",
  unreadCount = 0,
  onOpenNotifications,
  onSignOut,
}: {
  greeting?: string;
  babyName?: string;
  babies?: Baby[];
  onSelectBaby?: (id: string) => void;
  status?: StatusTone;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 px-[18px] pb-3 pt-[max(18px,env(safe-area-inset-top))]">
      <div
        className="size-11 shrink-0 rounded-full bg-gradient-to-br from-primary-soft to-[#D9D2FB]"
        aria-hidden="true"
      />
      <div className="relative min-w-0">
        <button
          type="button"
          aria-label="Switch baby"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-col items-start text-left"
        >
          <span className="text-[12.5px] text-ink-2">{greeting}</span>
          <span className="flex items-center gap-1 text-[17px] font-bold text-ink">
            <span className="truncate">{babyName}</span>
            <span className="text-ink-3">
              <ChevronDown />
            </span>
          </span>
        </button>
        {open && babies.length > 0 && (
          <ul className="absolute left-0 top-full z-10 mt-2 min-w-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_14px_30px_-12px_rgba(22,23,31,0.25)]">
            {babies.map((baby) => (
              <li key={baby.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectBaby?.(baby.id);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {baby.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <StatusPill tone={status} />
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          onClick={onOpenNotifications}
          className="relative grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-2"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-alert px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-surface">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label="Sign out"
          onClick={onSignOut}
          className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-2"
        >
          <SignOut />
        </button>
      </div>
    </header>
  );
}
