// A controllable IntersectionObserver mock for jsdom: components can observe a
// sentinel, and tests fire `triggerIntersection()` to simulate it scrolling into
// view. Installed globally in setup.ts and reset between tests.
type IOEntry = { isIntersecting: boolean };

const callbacks: Array<(entries: IOEntry[]) => void> = [];

class MockIntersectionObserver {
  constructor(cb: (entries: IOEntry[]) => void) {
    callbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

export function installIntersectionObserver() {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
}

export function resetIntersection() {
  callbacks.length = 0;
}

// triggerIntersection simulates every live sentinel scrolling into (or out of) view.
export function triggerIntersection(isIntersecting = true) {
  callbacks.forEach((cb) => cb([{ isIntersecting }]));
}
