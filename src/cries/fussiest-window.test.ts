import { describe, expect, test } from "vitest";
import { fussiestWindow } from "./fussiest-window";

describe("fussiestWindow", () => {
  test("returns the hour with the most cries", () => {
    const hourly = new Array(24).fill(0);
    hourly[3] = 2;
    hourly[19] = 5; // peak
    hourly[20] = 4;

    expect(fussiestWindow(hourly)).toEqual({ hour: 19, count: 5 });
  });

  test("breaks ties toward the earliest hour", () => {
    const hourly = new Array(24).fill(0);
    hourly[8] = 3;
    hourly[14] = 3; // same count, later — should not win

    expect(fussiestWindow(hourly)).toEqual({ hour: 8, count: 3 });
  });
});
