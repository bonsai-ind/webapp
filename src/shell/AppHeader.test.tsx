import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  test("the sign-out control invokes onSignOut", async () => {
    const onSignOut = vi.fn();
    render(<AppHeader onSignOut={onSignOut} />);

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
