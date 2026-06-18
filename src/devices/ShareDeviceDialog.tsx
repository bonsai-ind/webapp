import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { ErrorNote, Field, primaryButtonClass } from "../ui/forms";
import { shareDevice } from "./devices-api";

export function ShareDeviceDialog({
  session,
  deviceId,
}: {
  session: Session;
  deviceId: string;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const { token } = await shareDevice(session, deviceId, email);
      setCode(token);
    } catch {
      setError(true);
    }
  }

  if (code) {
    return (
      <div className="rounded-card border border-line bg-surface p-[18px]">
        <p className="text-[13.5px] font-semibold text-ink">Invite ready</p>
        <p className="mt-1 text-[12.5px] text-ink-2">
          Send your nanny this code to finish setup:
        </p>
        <p className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-center font-mono text-[15px] font-semibold tracking-wide text-primary-700">
          Share code: {code}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
      <p className="text-[13.5px] font-semibold text-ink">Share with your nanny</p>
      {error && <ErrorNote>Couldn’t share this monitor. Please try again.</ErrorNote>}
      <Field label="Nanny’s email" type="email" value={email} onChange={setEmail} />
      <button type="submit" disabled={email.trim() === ""} className={`mt-1 ${primaryButtonClass}`}>
        Share with nanny
      </button>
    </form>
  );
}
