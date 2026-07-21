/**
 * Server-side data access for the SEO/SSR cutoff pages.
 *
 * These helpers run only in server components, generateStaticParams, and
 * sitemap generation — they call the Render backend directly (not the
 * /api/* edge proxy, which exists for browser traffic) and lean on the
 * Next.js data cache (`revalidate`) so ISR pages don't hammer the small
 * free-tier origin: each URL is fetched at most once per revalidation
 * window per deployment, and the backend's own Redis cache absorbs the rest.
 */

const BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:5000" : "");

const PROXY_TOKEN = process.env.INTERNAL_PROXY_TOKEN || "";

/** 6h — matches the backend Redis TTL and the edge proxy s-maxage. */
export const CUTOFFS_REVALIDATE_SECONDS = 21600;

export interface CollegeOption {
  code: string | null;
  name: string;
}

export interface CutoffMeta {
  colleges: CollegeOption[];
  branches: string[];
  cities: string[];
}

export interface CutoffRow {
  id: string;
  year: number;
  college_code: string;
  college_name: string;
  college_status: string | null;
  city: string | null;
  choice_code: string;
  branch: string;
  branch_group: string | null;
  cap_round: number;
  stage: string;
  allotment_pool: string;
  category_code: string;
  category: string | null;
  gender: string | null;
  cutoff_rank: number | null;
  percentile: number | string | null;
}

export interface CollegeInfo {
  college_code: string;
  name: string;
  status: string | null;
  city: string | null;
}

export interface CollegeCutoffsPayload {
  college: CollegeInfo;
  cutoffs: CutoffRow[];
  year: number;
}

async function backendGet<T>(
  path: string,
  revalidate: number,
): Promise<T | null> {
  if (!BACKEND) return null;
  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      headers,
      next: { revalidate },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data.data as T) : null;
  } catch {
    // Build/ISR must never hard-fail because the free-tier origin was asleep;
    // callers render a graceful fallback and the next revalidation retries.
    return null;
  }
}

/** Filter metadata: full college list (code + name), branches, cities. */
export async function fetchCutoffMeta(year: string): Promise<CutoffMeta | null> {
  return backendGet<CutoffMeta>(
    `/api/v1/cutoffs/meta?year=${year}`,
    CUTOFFS_REVALIDATE_SECONDS,
  );
}

export type CollegeCutoffsResult =
  | { status: "ok"; data: CollegeCutoffsPayload }
  | { status: "not-found" }
  | { status: "error" };

/**
 * Complete closing-cutoff set for one college (all branches/rounds/categories).
 * "not-found" (unknown code → render 404) is kept distinct from "error"
 * (backend unreachable → throw so ISR retries instead of caching a 404).
 */
export async function fetchCollegeCutoffs(
  collegeCode: string,
): Promise<CollegeCutoffsResult> {
  if (!BACKEND) return { status: "error" };
  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  try {
    const res = await fetch(
      `${BACKEND}/api/v1/cutoffs/college/${encodeURIComponent(collegeCode)}`,
      { headers, next: { revalidate: CUTOFFS_REVALIDATE_SECONDS } },
    );
    if (res.status === 404 || res.status === 400) return { status: "not-found" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return data?.success
      ? { status: "ok", data: data.data as CollegeCutoffsPayload }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

/**
 * A representative server-rendered dataset for /cutoffs: the top closing
 * cutoffs of CAP Round 1 (highest percentiles first, capped at 500 by the
 * backend). Used purely as crawlable initial content.
 */
export async function fetchTopCutoffs(year: string): Promise<CutoffRow[]> {
  if (!BACKEND) return [];
  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  try {
    const res = await fetch(
      `${BACKEND}/api/v1/cutoffs?year=${year}&round=1`,
      { headers, next: { revalidate: CUTOFFS_REVALIDATE_SECONDS } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.success && Array.isArray(data.data)
      ? (data.data as CutoffRow[])
      : [];
  } catch {
    return [];
  }
}
