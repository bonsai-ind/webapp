import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CryAlert } from "./CryAlert";

const episode = { id: "ep-7", babyName: "Mia", cause: "hungry", startedAt: Date.now() - 18_000 };
const noop = () => {};

describe("CryAlert", () => {
  test("shows the crying baby, likely cause and elapsed time", () => {
    render(<CryAlert episode={episode} onOpen={noop} onSnooze={noop} />);

    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
    expect(screen.getByText(/hungry/i)).toBeInTheDocument();
    expect(screen.getByText(/started 18s ago/i)).toBeInTheDocument();
  });

  test("shows the last-feed line when the episode carries it", () => {
    render(<CryAlert episode={{ ...episode, lastFedAgo: "2h ago" }} onOpen={noop} onSnooze={noop} />);
    expect(screen.getByText("Last fed 2h ago")).toBeInTheDocument();
  });

  test("omits the last-feed line when the baby has no recorded feeds", () => {
    render(<CryAlert episode={episode} onOpen={noop} onSnooze={noop} />);
    expect(screen.queryByText(/last fed/i)).not.toBeInTheDocument();
  });

  test("the actions invoke their handlers; there is no Talk button", async () => {
    const onOpen = vi.fn();
    const onSnooze = vi.fn();
    render(<CryAlert episode={episode} onOpen={onOpen} onSnooze={onSnooze} />);

    expect(screen.queryByRole("button", { name: /^talk$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open live monitor/i }));
    await userEvent.click(screen.getByRole("button", { name: /snooze 5 min/i }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onSnooze).toHaveBeenCalledOnce();
  });
});
