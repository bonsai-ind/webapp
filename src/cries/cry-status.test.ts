import { describe, expect, test } from "vitest";
import { cryStatusReducer, initialCryStatus, type CryStatus } from "./cry-status";

const cry = (state: CryStatus, episodeId: string, babyId: string, babyName: string, at = 1000) =>
  cryStatusReducer(state, { kind: "crying", episodeId, babyId, babyName, at });

describe("cryStatusReducer", () => {
  test("a crying event sets status to crying with the active episode", () => {
    const next = cryStatusReducer(initialCryStatus, {
      kind: "crying",
      episodeId: "ep-7",
      babyName: "Mia",
      cause: "hungry",
      at: 1000,
    });

    expect(next.status).toBe("crying");
    expect(next.episode).toMatchObject({ id: "ep-7", babyName: "Mia", cause: "hungry", startedAt: 1000 });
  });

  test("a crying event carries lastFedAgo onto the episode (drives the alert's feed line)", () => {
    const next = cryStatusReducer(initialCryStatus, {
      kind: "crying",
      episodeId: "ep-7",
      babyName: "Mia",
      cause: "hungry",
      lastFedAgo: "2h ago",
      at: 1000,
    });
    expect(next.episode?.lastFedAgo).toBe("2h ago");
  });

  test("a crying event carries the episode's babyId (drives Open navigation)", () => {
    const next = cry(initialCryStatus, "ep-7", "bby_42", "Mia");
    expect(next.episode?.babyId).toBe("bby_42");
  });

  test("a calm for the SAME episode clears it", () => {
    const crying = cry(initialCryStatus, "ep-7", "bby_1", "Mia");
    const next = cryStatusReducer(crying, { kind: "calm", episodeId: "ep-7" });

    expect(next.status).toBe("calm");
    expect(next.episode).toBeUndefined();
    expect(next.episodes).toHaveLength(0);
  });

  test("TWO babies crying are both tracked; calm for one keeps the other's alert", () => {
    let state = cry(initialCryStatus, "ep-a", "bby_a", "Mia", 1000);
    state = cry(state, "ep-b", "bby_b", "Noah", 2000);

    expect(state.episodes).toHaveLength(2);
    expect(state.episode?.babyName).toBe("Noah"); // most recent drives the takeover

    const afterCalmB = cryStatusReducer(state, { kind: "calm", episodeId: "ep-b" });
    expect(afterCalmB.status).toBe("crying"); // Mia is STILL crying
    expect(afterCalmB.episode?.babyName).toBe("Mia");

    const allCalm = cryStatusReducer(afterCalmB, { kind: "calm", episodeId: "ep-a" });
    expect(allCalm.status).toBe("calm");
  });

  test("a calm matched by babyId clears that baby's episode", () => {
    const state = cry(initialCryStatus, "ep-a", "bby_a", "Mia");
    const next = cryStatusReducer(state, { kind: "calm", babyId: "bby_a" });
    expect(next.status).toBe("calm");
  });

  test("a bare legacy calm (no episode, no baby) clears everything", () => {
    let state = cry(initialCryStatus, "ep-a", "bby_a", "Mia");
    state = cry(state, "ep-b", "bby_b", "Noah");
    expect(cryStatusReducer(state, { kind: "calm" }).status).toBe("calm");
  });

  test("a re-announced episode keeps its original start time", () => {
    const first = cry(initialCryStatus, "ep-a", "bby_a", "Mia", 1000);
    const replay = cry(first, "ep-a", "bby_a", "Mia", 9000);
    expect(replay.episodes).toHaveLength(1);
    expect(replay.episode?.startedAt).toBe(1000);
  });

  test("fussing is distinct from crying and never interrupts an active alert", () => {
    expect(cryStatusReducer(initialCryStatus, { kind: "fussing" }).status).toBe("fussing");

    const crying = cry(initialCryStatus, "ep-7", "bby_1", "Mia");
    const next = cryStatusReducer(crying, { kind: "fussing" });
    expect(next.status).toBe("crying"); // active alert survives
  });
});
