import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { deviceAccess } from "./device-access";
import { DeviceControls } from "./DeviceControls";

describe("DeviceControls", () => {
  test("a primary member (parent) sees the Share with nanny button", () => {
    const access = deviceAccess([{ deviceId: "dev_1", role: "primary" }]);
    render(<DeviceControls access={access} deviceId="dev_1" onShare={() => {}} />);

    expect(screen.getByRole("button", { name: /share with nanny/i })).toBeInTheDocument();
  });

  test("a guest (nanny) sees Talk but not Share", () => {
    const access = deviceAccess([{ deviceId: "dev_1", role: "guest" }]);
    render(<DeviceControls access={access} deviceId="dev_1" onShare={() => {}} />);

    expect(
      screen.queryByRole("button", { name: /share with nanny/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /talk/i })).toBeInTheDocument();
  });

  test("clicking Share with nanny invokes onShare", async () => {
    const onShare = vi.fn();
    const access = deviceAccess([{ deviceId: "dev_1", role: "primary" }]);
    render(<DeviceControls access={access} deviceId="dev_1" onShare={onShare} />);

    await userEvent.click(screen.getByRole("button", { name: /share with nanny/i }));

    expect(onShare).toHaveBeenCalledOnce();
  });
});
