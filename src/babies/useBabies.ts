import { useQuery } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

export interface Baby {
  id: string;
  name: string;
  // avatarUrl is always present on the wire (the device-service BabyResponse
  // marshals AvatarURL unconditionally); empty string means render the
  // gradient + first-initial fallback in <BabyAvatar />.
  avatarUrl: string;
  // Optional date of birth (YYYY-MM-DD) + derived whole weeks since birth — the
  // Parent hub's personalization clock (baby age + mother postpartum stage).
  dateOfBirth?: string;
  ageWeeks?: number;
  // Sex + gestational age drive WHO growth percentiles.
  sex?: "male" | "female";
  gestationalAgeWeeks?: number;
  // Profile (birth / care / emergency) — all optional.
  birthWeightKg?: number;
  birthLengthCm?: number;
  birthHeadCircumferenceCm?: number;
  deliveryType?: "vaginal" | "cesarean";
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  pediatricianName?: string;
  pediatricianPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export function useBabies(session: Session): { babies: Baby[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ["babies"],
    queryFn: () => getJson<Baby[]>(session, "/babies"),
  });
  return { babies: query.data ?? [], isLoading: query.isLoading };
}
