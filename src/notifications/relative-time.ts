// formatRelativeTime renders an ISO timestamp as a human relative string
// ("just now", "2 hours ago", "Yesterday"), falling back to a formatted date
// beyond a week. `now` is injectable for deterministic tests.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return "just now";
  if (min < 60) return `${min} ${min === 1 ? "minute" : "minutes"} ago`;
  if (hour < 24) return `${hour} ${hour === 1 ? "hour" : "hours"} ago`;
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return then.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
