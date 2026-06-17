export interface PredictorRequest {
  rank?: number;
  percentile?: number;
  year?: number;
  category?: string;
  gender?: string;
  minority_types?: string[];
  minority_groups?: string[];
  level?: string;
  preferred_branches?: string[];
  cities?: string[];
  include_tfws?: boolean;
  // Accepted by the request schema but not used by the round-1 predictor model.
  homeUniversity?: string;
  branch?: string;
  stage?: string;
}

export interface CollegeOption {
  id: string;
  college_code: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  college_status: string | null;
  cap_round: number;
  stage: string; // roman numeral of the CAP round (predictor is pinned to round 1)
  cutoff_rank: number | null;
  cutoff_percentile: number;
  year: number;
}

export interface PredictorResponse {
  safe: CollegeOption[];
  target: CollegeOption[];
  dream: CollegeOption[];
  meta: {
    inputMode: 'rank' | 'percentile';
    effectiveRank: number;
    inputPercentile?: number;
    windowFloor: number;
    windowCeil: number;
  };
}

export interface PredictorFilters {
  year: number;
  cap_round: number;
  category?: string;
  gender?: string;
  minority_types?: string[];
  minority_groups?: string[];
  preferred_branches?: string[];
  cities?: string[];
  include_tfws?: boolean;
  min_cutoff_rank?: number;
  max_cutoff_rank?: number;
}
