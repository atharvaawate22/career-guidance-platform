export const CANDIDATE_GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
] as const;

export function formatSeatType(gender: string | null | undefined) {
  const normalized = gender?.trim().toLowerCase();

  if (!normalized || normalized === "all") {
    return "Gender-Neutral";
  }

  if (normalized === "female") {
    return "Ladies Only";
  }

  return gender ?? "Gender-Neutral";
}
