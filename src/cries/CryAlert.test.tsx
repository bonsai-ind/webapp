import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CryAlert } from "./CryAlert";

const episode = { id: "ep-7", babyName: "Mia", cause: "hungry" };
const noop = () => {};

describe("CryAlert", () => {
  test("shows the crying baby and the likely cause", () => {
    render(<CryAlert episode={episode} onOpen={noop} onTalk={noop} onSnooze={noop} />);

    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
    expect(screen.getByText(/hungry/i)).toBeInTheDocument();
  });

  test("the actions invoke their handlers", async () => {
    const onOpen = vi.fn();
    const onTalk = vi.fn();
    const onSnooze = vi.fn();
    render(<CryAlert episode={episode} onOpen={onOpen} onTalk={onTalk} onSnooze={onSnooze} />);

    await userEvent.click(screen.getByRole("button", { name: /open live monitor/i }));
    await userEvent.click(screen.getByRole("button", { name: /talk/i }));
    await userEvent.click(screen.getByRole("button", { name: /snooze/i }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onTalk).toHaveBeenCalledOnce();
    expect(onSnooze).toHaveBeenCalledOnce();
  });
});
