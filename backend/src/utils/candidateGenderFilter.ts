interface CandidateGenderFilter {
  condition?: string;
  values: string[];
  nextIndex: number;
}

export function buildCandidateGenderFilter(
  candidateGender: string | undefined,
  startIndex: number,
): CandidateGenderFilter {
  const normalized = candidateGender?.trim().toLowerCase();

  if (normalized === 'male' || normalized === 'all') {
    return {
      condition: `COALESCE(gender, 'All') = $${startIndex}`,
      values: ['All'],
      nextIndex: startIndex + 1,
    };
  }

  if (normalized === 'female') {
    return {
      condition: `(COALESCE(gender, 'All') = $${startIndex} OR COALESCE(gender, 'All') = $${startIndex + 1})`,
      values: ['All', 'Female'],
      nextIndex: startIndex + 2,
    };
  }

  return {
    values: [],
    nextIndex: startIndex,
  };
}
