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

export function getMinorityGroupDefinitions(): MinorityGroupDefinition[] {
  return MINORITY_GROUP_DEFINITIONS;
}
