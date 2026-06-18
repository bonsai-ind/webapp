import type { Session } from "../session/session";

export function SwitchOrgMenu({
  orgs,
  session,
  onSwitched,
}: {
  orgs: Array<{ id: string; name: string }>;
  session: Session;
  onSwitched?: () => void;
}) {
  // Nothing to switch between — single-org users never see a switcher.
  if (orgs.length <= 1) return null;

  async function choose(orgId: string) {
    await session.switchOrg(orgId);
    onSwitched?.();
  }

  return (
    <ul className="overflow-hidden rounded-card border border-line bg-surface">
      {orgs.map((org) => (
        <li key={org.id} className="border-b border-line last:border-b-0">
          <button
            type="button"
            onClick={() => choose(org.id)}
            className="flex w-full items-center px-4 py-3 text-left text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {org.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
