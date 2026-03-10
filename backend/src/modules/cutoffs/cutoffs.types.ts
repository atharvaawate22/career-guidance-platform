export interface CutoffData {
  id: string;
  year: number;
  college_code: string | null;
  college_name: string;
  branch_code: string | null;
  branch: string;
  category: string;
  gender: string | null;
  home_university: string;
  college_status: string | null;
  stage: string | null;
  level: string | null;
  percentile: number;
  cutoff_rank: number | null;
  created_at: Date;
}

export interface CutoffFilters {
  year?: number;
  branch?: string;
  category?: string;
  gender?: string;
  home_university?: string;
  college_name?: string;
  college_code?: string;
  branch_code?: string;
  stage?: string;
  level?: string;
}

export interface BulkCutoffInsert {
  year: number;
  college_code?: string;
  college_name: string;
  branch_code?: string;
  branch: string;
  category: string;
  gender?: string;
  home_university?: string;
  college_status?: string;
  stage?: string;
  level?: string;
  percentile: number;
  cutoff_rank?: number;
}
