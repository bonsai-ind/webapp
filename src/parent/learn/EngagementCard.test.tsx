import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithQuery } from "../../test/query";
import { createSession } from "../../session/session";
import { EngagementCard } from "./EngagementCard";
import type { EngagementItem } from "./useEngagementFeed";

const BASE = "https://api.test";
const session = () => createSession({ baseUrl: BASE });
const item = (over: Partial<EngagementItem> = {}): EngagementItem => ({
  id: "ec_1",
  kind: "article",
  topic: "sleep",
  title: "Sleep tips",
  body: "Some helpful body text.",
  imageUrl: "",
  publishedAt: "2026-07-01T00:00:00Z",
  read: false,
  bookmarked: false,
  isNew: true,
  ...over,
});

describe("EngagementCard", () => {
  test("shows a New pill and a Save action for a fresh article", () => {
    renderWithQuery(<EngagementCard item={item()} session={session()} />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument(); // topic pill
  });

  test("a video card reveals a privacy-enhanced embed on Watch, and marks read", async () => {
    let readHit = false;
    server.use(
      http.post(`${BASE}/engagement/ec_1/read`, () => {
        readHit = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithQuery(
      <EngagementCard item={item({ kind: "video", videoProvider: "youtube", videoId: "abc123" })} session={session()} />,
    );

    expect(screen.queryByTestId("video-embed")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /watch/i }));

    const iframe = (await screen.findByTestId("video-embed")).querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain("youtube-nocookie.com/embed/abc123");
    await vi.waitFor(() => expect(readHit).toBe(true));
  });

  test("an already-read card shows the Read marker", () => {
    renderWithQuery(<EngagementCard item={item({ read: true, isNew: false })} session={session()} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });
});
