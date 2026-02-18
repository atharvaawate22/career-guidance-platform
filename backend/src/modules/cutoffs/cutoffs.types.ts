export interface CutoffData {
  id: string;
  year: number;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  home_university: string;
  percentile: number;
  created_at: Date;
}

export interface CutoffFilters {
  year?: number;
  branch?: string;
  category?: string;
  gender?: string;
  home_university?: string;
  college_name?: string;
}

export interface BulkCutoffInsert {
  year: number;
  college_name: string;
  branch: string;
  category: string;
  gender?: string;
  home_university: string;
  percentile: number;
}
