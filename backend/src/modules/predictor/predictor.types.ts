export interface PredictorRequest {
  percentile: number;
  year: number;
  category?: string;
  gender?: string;
  home_university?: string;
  preferred_branches?: string[];
}

export interface CollegeOption {
  id: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  home_university: string;
  cutoff_percentile: number;
  year: number;
}

export interface PredictorResponse {
  safe: CollegeOption[];
  target: CollegeOption[];
  dream: CollegeOption[];
}

export interface PredictorFilters {
  year: number;
  category?: string;
  gender?: string;
  home_university?: string;
  preferred_branches?: string[];
}
