export interface PredictorRequest {
  percentile: number;
  year?: number;
  category?: string;
  gender?: string;
  level?: string; // 'State Level' | 'Home University Level' | 'Other Than Home University Level'
  preferred_branches?: string[];
  cities?: string[];
}

export interface CollegeOption {
  id: string;
  college_code: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
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
}

export interface PredictorFilters {
  year: number;
  category?: string;
  gender?: string;
  level?: string;
  preferred_branches?: string[];
  cities?: string[];
}
