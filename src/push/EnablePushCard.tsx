import { useState } from "react";
import type { Session } from "../session/session";
import { primaryButtonClass } from "../ui/forms";
import { enablePushNotifications, type PushResult } from "./enable-push";

export function EnablePushCard({
  session,
  enable = enablePushNotifications,
}: {
  session: Session;
  enable?: (session: Session) => Promise<PushResult>;
}) {
  const [result, setResult] = useState<PushResult>();

  async function onEnable() {
    setResult(await enable(session));
  }

  if (result === "enabled") {
    return (
      <div className="rounded-card border border-line bg-surface p-[18px]">
        <p className="text-[13.5px] font-semibold text-calm">Cry alerts are on.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[18px]">
      <p className="text-[13.5px] font-semibold text-ink">Never miss a cry</p>
      <p className="text-[12.5px] text-ink-2">Get an alert the moment your baby cries — even when the app is closed.</p>

      {result === "denied" && (
        <p role="alert" className="rounded-xl bg-amber-soft px-3 py-2 text-[12.5px] font-medium text-amber">
          Notifications are blocked. Turn them on for Hush in your browser or device settings, then try again.
        </p>
      )}
      {result === "unsupported" && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
          Add Hush to your home screen to receive background cry alerts.
        </p>
      )}

      <button type="button" onClick={onEnable} className={`mt-1 ${primaryButtonClass}`}>
        Enable cry alerts
      </button>
    </div>
  );
}
