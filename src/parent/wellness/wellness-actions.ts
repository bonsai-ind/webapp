import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "../../session/session";
import { postVoid } from "../../api/get-json";

function refresh(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["wellness"] });
}

// Enroll the caller in a program.
export async function enroll(session: Session, qc: QueryClient, programId: string): Promise<void> {
  await postVoid(session, `/wellness/programs/${programId}/enroll`);
  refresh(qc);
}

// Mark a program session complete (auto-enrolls server-side).
export async function completeSession(
  session: Session,
  qc: QueryClient,
  programId: string,
  sessionId: string,
): Promise<void> {
  await postVoid(session, `/wellness/programs/${programId}/sessions/${sessionId}/complete`);
  refresh(qc);
}
