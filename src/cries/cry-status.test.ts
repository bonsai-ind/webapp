import { describe, expect, test } from "vitest";
import { cryStatusReducer, initialCryStatus } from "./cry-status";

describe("cryStatusReducer", () => {
  test("a crying event sets status to crying with the active episode", () => {
    const next = cryStatusReducer(initialCryStatus, {
      kind: "crying",
      episodeId: "ep-7",
      babyName: "Mia",
      cause: "hungry",
    });

    expect(next.status).toBe("crying");
    expect(next.episode).toEqual({ id: "ep-7", babyName: "Mia", cause: "hungry" });
  });

  test("a calm event returns to calm and clears the episode", () => {
    const crying = cryStatusReducer(initialCryStatus, { kind: "crying", episodeId: "ep-7", babyName: "Mia" });
    const next = cryStatusReducer(crying, { kind: "calm" });

    expect(next.status).toBe("calm");
    expect(next.episode).toBeUndefined();
  });

  test("a fussing event is distinct from crying and carries no episode", () => {
    const crying = cryStatusReducer(initialCryStatus, { kind: "crying", episodeId: "ep-7", babyName: "Mia" });
    const next = cryStatusReducer(crying, { kind: "fussing" });

    expect(next.status).toBe("fussing");
    expect(next.episode).toBeUndefined();
  });
});
