import { describe, expect, test } from "vitest";
import { formatRelativeTime } from "./relative-time";

const now = new Date("2026-01-10T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  test("seconds ago reads as 'just now'", () => {
    expect(formatRelativeTime(ago(5 * SEC), now)).toBe("just now");
  });
  test("minutes ago", () => {
    expect(formatRelativeTime(ago(2 * MIN), now)).toBe("2 minutes ago");
    expect(formatRelativeTime(ago(1 * MIN), now)).toBe("1 minute ago");
  });
  test("hours ago", () => {
    expect(formatRelativeTime(ago(2 * HOUR), now)).toBe("2 hours ago");
  });
  test("one day ago reads as 'Yesterday'", () => {
    expect(formatRelativeTime(ago(1 * DAY), now)).toBe("Yesterday");
  });
  test("several days ago", () => {
    expect(formatRelativeTime(ago(3 * DAY), now)).toBe("3 days ago");
  });
  test("older than a week falls back to a formatted date", () => {
    const out = formatRelativeTime(ago(30 * DAY), now);
    expect(out).not.toMatch(/ago|Yesterday|just now/);
    expect(out.length).toBeGreaterThan(0);
  });
});
