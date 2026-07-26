/**
 * Deliberately narrow: only blocks hard slurs/extreme profanity, never mere
 * negativity. A frustrated review ("worst experience", "waste of time",
 * "terrible support") must always pass — only genuinely abusive language
 * should be rejected. Matched whole-word, case-insensitive, so it doesn't
 * false-positive on substrings inside unrelated words.
 */
const ABUSIVE_TERMS = [
  'fuck', 'fucking', 'fucker', 'motherfucker',
  'bitch', 'bastard', 'asshole', 'cunt', 'dickhead', 'prick',
  'slut', 'whore', 'bhosdike', 'bhosadi', 'madarchod', 'behenchod',
  'chutiya', 'chutiye', 'randi', 'gandu', 'harami',
  'nigger', 'nigga', 'chink', 'paki', 'faggot',
];

const ABUSIVE_PATTERN = new RegExp(
  `\\b(${ABUSIVE_TERMS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

export function containsAbusiveLanguage(text: string): boolean {
  return ABUSIVE_PATTERN.test(text);
}
