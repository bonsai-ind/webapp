import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "../session/session";
import { AuthCard, ErrorNote, Field, primaryButtonClass } from "../ui/forms";

export function AuthGate({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  // Seed from the session's current state, not just future events — the session
  // may already be authenticated before this mounts (accept-invite, or restore()
  // on reload), and those events fire before the subscription exists.
  const [authed, setAuthed] = useState(() => session.me() !== null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(
    () => session.onAuthChange((state) => setAuthed(state.status === "authenticated")),
    [session],
  );

  if (authed) return <>{children}</>;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      await session.login(email, password);
    } catch {
      // Wrong password and unknown email are indistinguishable — one generic message.
      setError(true);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to keep watch.">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error && <ErrorNote>That email or password didn’t match. Try again.</ErrorNote>}
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        <button type="submit" className={`mt-1 ${primaryButtonClass}`}>
          Sign in
        </button>
      </form>
    </AuthCard>
  );
}
