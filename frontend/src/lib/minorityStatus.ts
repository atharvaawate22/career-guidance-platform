export type MinorityTypeValue = "" | "linguistic" | "religious";

interface MinorityGroupOption {
  value: string;
  label: string;
  type: Exclude<MinorityTypeValue, "">;
  aliases: string[];
}

export interface SelectOption {
  value: string;
  label: string;
}

const MINORITY_GROUP_OPTIONS: MinorityGroupOption[] = [
  { value: "gujarati", label: "Gujarati", type: "linguistic", aliases: ["gujarathi", "gujar"] },
  { value: "hindi", label: "Hindi", type: "linguistic", aliases: ["hindi"] },
  { value: "malayalam", label: "Malayalam", type: "linguistic", aliases: ["malayalam", "malyalam"] },
  { value: "punjabi", label: "Punjabi", type: "linguistic", aliases: ["punjabi"] },
  { value: "sindhi", label: "Sindhi", type: "linguistic", aliases: ["sindhi"] },
  { value: "tamil", label: "Tamil", type: "linguistic", aliases: ["tamil"] },
  { value: "christian", label: "Christian", type: "religious", aliases: ["christian"] },
  { value: "jain", label: "Jain", type: "religious", aliases: ["jain"] },
  { value: "muslim", label: "Muslim", type: "religious", aliases: ["muslim"] },
  {
    value: "roman_catholics",
    label: "Roman Catholics",
    type: "religious",
    aliases: ["roman catholics", "roman catholic"],
  },
] as const;

export const MINORITY_TYPE_OPTIONS: SelectOption[] = [
  { value: "linguistic", label: "Linguistic Minority" },
  { value: "religious", label: "Religious Minority" },
];

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getMinorityGroupOptions(minorityTypes: string[]): SelectOption[] {
  const groups =
    minorityTypes.length === 0
      ? MINORITY_GROUP_OPTIONS
      : MINORITY_GROUP_OPTIONS.filter((group) => minorityTypes.includes(group.type));

  return groups.map(({ value, label }) => ({ value, label }));
}

export function getMinorityTypesForGroups(groupValues: string[]): Exclude<MinorityTypeValue, "">[] {
  return Array.from(
    new Set(
      groupValues
        .map(
          (groupValue) =>
            MINORITY_GROUP_OPTIONS.find((option) => option.value === groupValue)
              ?.type,
        )
        .filter((value): value is Exclude<MinorityTypeValue, ""> => Boolean(value)),
    ),
  );
}

export function getMinorityStatusLabel(
  collegeStatus: string | null | undefined,
): string | null {
  if (!collegeStatus) return null;

  const normalized = collegeStatus.trim();
  const lowered = normalized.toLowerCase();

  let typeLabel: string | null = null;
  let relevantGroups = MINORITY_GROUP_OPTIONS;

  if (lowered.includes("linguistic minority")) {
    typeLabel = "Linguistic Minority";
    relevantGroups = MINORITY_GROUP_OPTIONS.filter(
      (group) => group.type === "linguistic",
    );
  } else if (lowered.includes("religious minority")) {
    typeLabel = "Religious Minority";
    relevantGroups = MINORITY_GROUP_OPTIONS.filter(
      (group) => group.type === "religious",
    );
  }

  if (!typeLabel) return null;

  const groupRaw = normalized.match(/Minority\s*-\s*(.+)$/i)?.[1]?.trim() ?? "";
  if (!groupRaw) return typeLabel;

  const knownGroup = relevantGroups.find((group) =>
    group.aliases.some((alias) => groupRaw.toLowerCase().includes(alias)),
  );

  return `${typeLabel} - ${knownGroup?.label ?? titleCase(groupRaw)}`;
}
