import { setupServer } from "msw/node";

// Tests register their own handlers per behavior via `server.use(...)`.
// Starting with no default handlers means an unhandled request is a loud error,
// which keeps tests honest about exactly which endpoints a behavior touches.
export const server = setupServer();
