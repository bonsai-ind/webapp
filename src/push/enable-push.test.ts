import { afterEach, describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import { enablePushNotifications } from "./enable-push";

const BASE = "https://api.test";

const g = globalThis as unknown as {
  Notification?: unknown;
  PushManager?: unknown;
};

function stubEnvironment(permission: NotificationPermission, subscribe = vi.fn()) {
  g.Notification = { requestPermission: vi.fn().mockResolvedValue(permission) };
  g.PushManager = function () {};
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { subscribe } }) },
  });
}

afterEach(() => {
  delete g.Notification;
  delete g.PushManager;
  // @ts-expect-error remove the stubbed property
  delete navigator.serviceWorker;
});

describe("enablePushNotifications", () => {
  test("on permission granted, subscribes and registers the subscription with the server", async () => {
    const subscribe = vi.fn().mockResolvedValue({
      endpoint: "https://push.example/abc",
      toJSON: () => ({ endpoint: "https://push.example/abc" }),
    });
    stubEnvironment("granted", subscribe);

    let posted: unknown;
    server.use(
      http.get(`${BASE}/push/vapid-public-key`, () => HttpResponse.json({ key: "AQID" })),
      http.post(`${BASE}/push/subscriptions`, async ({ request }) => {
        posted = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const result = await enablePushNotifications(createSession({ baseUrl: BASE }));

    expect(result).toBe("enabled");
    expect(subscribe).toHaveBeenCalledOnce();
    expect(posted).toEqual({ endpoint: "https://push.example/abc" });
  });

  test("on permission denied, returns 'denied' and does not subscribe", async () => {
    const subscribe = vi.fn();
    stubEnvironment("denied", subscribe);

    const result = await enablePushNotifications(createSession({ baseUrl: BASE }));

    expect(result).toBe("denied");
    expect(subscribe).not.toHaveBeenCalled();
  });

  test("returns 'unsupported' when the browser lacks push APIs", async () => {
    delete g.Notification;
    delete g.PushManager;
    // @ts-expect-error ensure absent
    delete navigator.serviceWorker;

    expect(await enablePushNotifications(createSession({ baseUrl: BASE }))).toBe("unsupported");
  });
});
