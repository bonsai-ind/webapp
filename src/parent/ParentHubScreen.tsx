import { useState } from "react";
import type { Session } from "../session/session";
import { Segmented } from "../ui/Segmented";
import { useBabies } from "../babies/useBabies";
import { LearnView } from "./learn/LearnView";
import { WellnessView } from "./wellness/WellnessView";
import { ShopView } from "./shop/ShopView";

const SECTIONS = ["Learn", "Wellness", "Shop"] as const;
type Section = (typeof SECTIONS)[number];

// A friendly age from weeks — the personalization clock shared by baby content
// (Learn) and the mother's postpartum stage (Wellness).
function ageLabel(weeks?: number): string | null {
  if (weeks == null) return null;
  if (weeks < 12) return `${weeks} ${weeks === 1 ? "week" : "weeks"} old`;
  const months = Math.round(weeks / 4.345);
  return `${months} months old`;
}

// The Parent hub: one tab, three segmented views — Learn (baby-growth content),
// Wellness (maternal programs), Shop (catalog + cart). All personalize off the
// baby's date of birth.
export function ParentHubScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const [section, setSection] = useState<Section>("Learn");
  const { babies } = useBabies(session);
  const baby = babies.find((b) => b.id === babyId);
  const age = ageLabel(baby?.ageWeeks);

  return (
    <div className="flex flex-col gap-[18px]">
      {age && (
        <p className="text-[12.5px] text-ink-2">
          Personalized for {baby?.name} · {age}
        </p>
      )}
      <Segmented options={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "Learn" && <LearnView session={session} babyId={babyId} />}
      {section === "Wellness" && <WellnessView session={session} babyId={babyId} />}
      {section === "Shop" && <ShopView session={session} />}
    </div>
  );
}
