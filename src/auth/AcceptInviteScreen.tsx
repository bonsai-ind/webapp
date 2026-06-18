import { useState, type FormEvent } from "react";
import type { Session } from "../session/session";
import { AuthCard, ErrorNote, Field, primaryButtonClass } from "../ui/forms";

export function AcceptInviteScreen({
  session,
  token,
  onAccepted,
  onBackToLogin,
}: {
  session: Session;
  token: string;
  onAccepted: () => void;
  onBackToLogin?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      await session.acceptInvite(token, password);
    } catch {
      // Invalid / expired / already-used invite.
      setError(true);
      return;
    }
    onAccepted();
  }

  return (
    <AuthCard title="Create your account" subtitle="Set a password to finish joining.">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error && <ErrorNote>This invite link is invalid or has expired.</ErrorNote>}
        <Field label="Choose a password" type="password" value={password} onChange={setPassword} />
        <button type="submit" className={`mt-1 ${primaryButtonClass}`}>
          Create account
        </button>
        {error && onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-[12.5px] font-semibold text-primary"
          >
            Back to sign in
          </button>
        )}
      </form>
    </AuthCard>
  );
}
