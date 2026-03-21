export type MinorityType = 'linguistic' | 'religious';

interface MinorityGroupDefinition {
  key: string;
  label: string;
  type: MinorityType;
  aliases: string[];
}

const MINORITY_GROUP_DEFINITIONS: MinorityGroupDefinition[] = [
  { key: 'gujarati', label: 'Gujarati', type: 'linguistic', aliases: ['gujarathi', 'gujar'] },
  { key: 'hindi', label: 'Hindi', type: 'linguistic', aliases: ['hindi'] },
  { key: 'malayalam', label: 'Malayalam', type: 'linguistic', aliases: ['malayalam', 'malyalam'] },
  { key: 'punjabi', label: 'Punjabi', type: 'linguistic', aliases: ['punjabi'] },
  { key: 'sindhi', label: 'Sindhi', type: 'linguistic', aliases: ['sindhi'] },
  { key: 'tamil', label: 'Tamil', type: 'linguistic', aliases: ['tamil'] },
  { key: 'christian', label: 'Christian', type: 'religious', aliases: ['christian'] },
  { key: 'jain', label: 'Jain', type: 'religious', aliases: ['jain'] },
  { key: 'muslim', label: 'Muslim', type: 'religious', aliases: ['muslim'] },
  {
    key: 'roman_catholics',
    label: 'Roman Catholics',
    type: 'religious',
    aliases: ['roman catholics', 'roman catholic'],
  },
];

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export interface MinorityStatusInfo {
  type: MinorityType | null;
  typeLabel: string | null;
  groupKey: string | null;
  groupLabel: string | null;
  label: string | null;
}

export function getMinorityGroupDefinitions(): MinorityGroupDefinition[] {
  return MINORITY_GROUP_DEFINITIONS;
}

function normalizeMinorityType(value: string): MinorityType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'linguistic') return 'linguistic';
  if (normalized === 'religious') return 'religious';
  return null;
}

function resolveMinorityGroup(value: string): MinorityGroupDefinition | null {
  const normalized = value.trim().toLowerCase();
  return (
    MINORITY_GROUP_DEFINITIONS.find(
      (group) =>
        group.key === normalized ||
        group.label.toLowerCase() === normalized ||
        group.aliases.some((alias) => normalized.includes(alias)),
    ) ?? null
  );
}

export function parseMinorityStatus(
  collegeStatus: string | null | undefined,
): MinorityStatusInfo {
  if (!collegeStatus) {
    return {
      type: null,
      typeLabel: null,
      groupKey: null,
      groupLabel: null,
      label: null,
    };
  }

  const normalized = collegeStatus.trim();
  const lowered = normalized.toLowerCase();

  let type: MinorityType | null = null;
  if (lowered.includes('linguistic minority')) {
    type = 'linguistic';
  } else if (lowered.includes('religious minority')) {
    type = 'religious';
  }

  if (!type) {
    return {
      type: null,
      typeLabel: null,
      groupKey: null,
      groupLabel: null,
      label: null,
    };
  }

  const typeLabel = type === 'linguistic' ? 'Linguistic Minority' : 'Religious Minority';
  const groupRawMatch = normalized.match(/Minority\s*-\s*(.+)$/i);
  const groupRaw = groupRawMatch?.[1]?.trim() || '';

  const knownGroup = MINORITY_GROUP_DEFINITIONS.find(
    (group) =>
      group.type === type &&
      group.aliases.some((alias) => groupRaw.toLowerCase().includes(alias)),
  );

  const groupKey = knownGroup?.key ?? (groupRaw ? groupRaw.toLowerCase().replace(/[^a-z0-9]+/g, '_') : null);
  const groupLabel = knownGroup?.label ?? (groupRaw ? titleCase(groupRaw) : null);

  return {
    type,
    typeLabel,
    groupKey,
    groupLabel,
    label: groupLabel ? `${typeLabel} - ${groupLabel}` : typeLabel,
  };
}

export function buildMinorityStatusFilter(
  minorityTypes: string[] | undefined,
  minorityGroups: string[] | undefined,
  startIndex: number,
): { condition: string; values: unknown[]; nextIndex: number } {
  const normalizedTypes = Array.from(
    new Set(
      (minorityTypes ?? [])
        .map((value) => normalizeMinorityType(value))
        .filter((value): value is MinorityType => Boolean(value)),
    ),
  );

  const resolvedGroups = Array.from(
    new Map(
      (minorityGroups ?? [])
        .map((value) => resolveMinorityGroup(value))
        .filter((value): value is MinorityGroupDefinition => Boolean(value))
        .map((group) => [group.key, group]),
    ).values(),
  );

  const conditions: string[] = [];
  const values: unknown[] = [];
  let nextIndex = startIndex;

  for (const minorityType of normalizedTypes) {
    const typePhrase =
      minorityType === 'linguistic'
        ? '%Linguistic Minority%'
        : '%Religious Minority%';
    conditions.push(`college_status ILIKE $${nextIndex++}`);
    values.push(typePhrase);
  }

  for (const groupDefinition of resolvedGroups) {
    const aliasConditions = groupDefinition.aliases.map(
      () => `LOWER(COALESCE(college_status, '')) LIKE $${nextIndex++}`,
    );
    conditions.push(`(${aliasConditions.join(' OR ')})`);
    values.push(
      ...groupDefinition.aliases.map((alias) => `%${alias.toLowerCase()}%`),
    );
  }

  return {
    condition: conditions.length > 0 ? `(${conditions.join(' OR ')})` : '',
    values,
    nextIndex,
  };
}
