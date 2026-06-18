import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // These touch the DOM; no-ops / skipped under the node environment.
  if (typeof document !== "undefined") cleanup();
  server.resetHandlers();
  if (typeof localStorage !== "undefined") localStorage.clear();
});
afterAll(() => server.close());
