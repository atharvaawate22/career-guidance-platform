export interface PredictorRequest {
  rank?: number;
  percentile?: number;
  year?: number;
  category?: string;
  gender?: string;
  minority_types?: string[];
  minority_groups?: string[];
  level?: string; // 'State Level' | 'Home University Level' | 'Other Than Home University Level'
  preferred_branches?: string[];
  cities?: string[];
  include_tfws?: boolean; // also include TFWS seats alongside the chosen category
}

export interface CollegeOption {
  id: string;
  college_code: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  college_status: string | null;
  level: string;
  stage: string;
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
  category?: string;
  gender?: string;
  minority_types?: string[];
  minority_groups?: string[];
  level?: string;
  preferred_branches?: string[];
  cities?: string[];
  include_tfws?: boolean;
  min_cutoff_rank?: number;
  max_cutoff_rank?: number;
}
