import { describe, expect, test } from "vitest";
import { deviceAccess } from "./device-access";

describe("deviceAccess", () => {
  test("a member can view their device", () => {
    const access = deviceAccess([{ deviceId: "dev_1", role: "primary" }]);
    expect(access.canView("dev_1")).toBe(true);
  });

  test("a non-member cannot view another family's device", () => {
    const access = deviceAccess([{ deviceId: "dev_1", role: "primary" }]);
    expect(access.canView("dev_2")).toBe(false);
  });

  test("a guest (nanny) can view and talk but cannot manage or share", () => {
    const access = deviceAccess([{ deviceId: "dev_1", role: "guest" }]);
    expect(access.canView("dev_1")).toBe(true);
    expect(access.canTalk("dev_1")).toBe(true);
    expect(access.canManage("dev_1")).toBe(false);
    expect(access.canShare("dev_1")).toBe(false);
  });

  test("capabilities are resolved per device from the matching membership", () => {
    // Parent of one baby's monitor, nanny-guest on another household's device.
    const access = deviceAccess([
      { deviceId: "dev_1", role: "primary" },
      { deviceId: "dev_2", role: "guest" },
    ]);

    expect(access.canManage("dev_1")).toBe(true);
    expect(access.canShare("dev_1")).toBe(true);

    expect(access.canView("dev_2")).toBe(true);
    expect(access.canShare("dev_2")).toBe(false); // being primary on dev_1 grants nothing on dev_2
    expect(access.canManage("dev_2")).toBe(false);
  });
});
