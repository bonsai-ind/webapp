import { describe, expect, test } from "vitest";
import { buildCryNotification } from "./cry-notification";

describe("buildCryNotification", () => {
  test("titles the alert with the baby and tags it by cry-episode id", () => {
    const n = buildCryNotification({ episodeId: "ep-7", babyName: "Mia" });

    expect(n.title).toMatch(/mia is crying/i);
    // The tag is the cross-channel dedup key: same episode over push + in-app
    // collapses to one notification (ADR-0004).
    expect(n.tag).toBe("ep-7");
  });
});
