/** One row returned by the cutoff explorer (colleges + courses + cutoffs joined
 *  and deduped to the closing cutoff per course / round / pool / category column). */
export interface CutoffRow {
  id: string;
  year: number; // academic_year
  college_code: string;
  college_name: string;
  college_status: string | null;
  city: string | null;
  choice_code: string;
  branch: string; // course_name
  branch_group: string | null;
  cap_round: number; // 1–4
  stage: string; // allotment stage within the round (I, II, …)
  allotment_pool: string; // STATE | HU_HU | HU_OHU | OHU_OHU | OHU_HU | AI
  category_code: string; // raw, e.g. GOPENS
  category: string | null; // display category (category or subquota)
  gender: string | null; // 'G' | 'L' | null
  cutoff_rank: number | null; // closing_rank
  percentile: number | null; // closing_percentile
}

export interface CutoffFilters {
  year: number;
  round?: number;
  branch_groups?: string[];
  category?: string;
  include_tfws?: boolean;
  gender?: string;
  minority_types?: string[];
  minority_groups?: string[];
  college_name?: string;
  college_code?: string;
  cities?: string[];
}
