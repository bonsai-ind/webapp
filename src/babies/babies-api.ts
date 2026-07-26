import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { patchJson, postJson, postVoid } from "../api/get-json";
import type { Baby } from "./useBabies";

// The editable profile payload (create + update share it). Empty strings clear
// text fields; undefined numbers clear numeric ones. Metric-only.
export interface BabyProfileInput {
  name: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  sex?: "male" | "female" | "";
  gestationalAgeWeeks?: number;
  birthWeightKg?: number;
  birthLengthCm?: number;
  birthHeadCircumferenceCm?: number;
  deliveryType?: "vaginal" | "cesarean" | "";
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  pediatricianName?: string;
  pediatricianPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

// Create a baby → the creator can see it immediately (creator-visibility), no
// device pairing needed. onCreated receives the new baby (to set it active).
export function useCreateBaby(session: Session, onCreated?: (baby: Baby) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BabyProfileInput) => postJson<Baby>(session, "/babies", body),
    onSuccess: (baby) => {
      qc.invalidateQueries({ queryKey: ["babies"] });
      onCreated?.(baby);
    },
  });
}

// Full-replace edit of a baby profile (any caregiver who can reach it).
export function useUpdateBaby(session: Session, babyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BabyProfileInput) => {
      if (!babyId) return Promise.reject(new Error("no baby"));
      return patchJson<Baby>(session, `/babies/${babyId}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["babies"] }),
  });
}

// Owner-only soft-remove.
export function useArchiveBaby(session: Session, onArchived?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (babyId: string) => postVoid(session, `/babies/${babyId}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["babies"] });
      onArchived?.();
    },
  });
}
