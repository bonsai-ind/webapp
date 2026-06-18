import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSession } from "../session/session";
import { EnablePushCard } from "./EnablePushCard";

const BASE = "https://api.test";
const session = createSession({ baseUrl: BASE });

describe("EnablePushCard", () => {
  test("enabling shows a confirmation", async () => {
    const enable = vi.fn().mockResolvedValue("enabled");
    render(<EnablePushCard session={session} enable={enable} />);

    await userEvent.click(screen.getByRole("button", { name: /enable cry alerts/i }));

    expect(enable).toHaveBeenCalledOnce();
    expect(await screen.findByText(/alerts are on/i)).toBeInTheDocument();
  });

  test("denied shows a recoverable explanation, not silent failure", async () => {
    const enable = vi.fn().mockResolvedValue("denied");
    render(<EnablePushCard session={session} enable={enable} />);

    await userEvent.click(screen.getByRole("button", { name: /enable cry alerts/i }));

    const note = await screen.findByRole("alert");
    expect(note).toHaveTextContent(/notification|settings|blocked/i);
  });

  test("unsupported shows install-to-home-screen guidance", async () => {
    const enable = vi.fn().mockResolvedValue("unsupported");
    render(<EnablePushCard session={session} enable={enable} />);

    await userEvent.click(screen.getByRole("button", { name: /enable cry alerts/i }));

    expect(await screen.findByText(/home screen/i)).toBeInTheDocument();
  });
});
