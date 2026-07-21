import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collegeSlug, parseCollegeSlug } from "@/lib/collegeSlug";
import { SITE_URL } from "@/lib/site";
import {
  fetchCollegeCutoffs,
  fetchCutoffMeta,
  type CutoffRow,
} from "@/lib/serverCutoffs";

const CUTOFF_YEAR = "2025";
const CAP_ROUNDS = [1, 2, 3, 4] as const;

// ISR: each college page refreshes every 6h, matching the backend cache TTL.
// Pages beyond the prebuilt subset are generated on first request and cached.
export const revalidate = 21600;
export const dynamicParams = true;

// Prebuild only a small subset at deploy time so the build doesn't hammer the
// free-tier backend with ~300 concurrent queries; the rest generate on demand
// via ISR (first hit warms the cache, later hits are static).
const PREBUILD_COUNT = 25;

export async function generateStaticParams() {
  const meta = await fetchCutoffMeta(CUTOFF_YEAR);
  return (meta?.colleges ?? [])
    .filter((c): c is { code: string; name: string } => !!c.code)
    .slice(0, PREBUILD_COUNT)
    .map((c) => ({ collegeSlug: collegeSlug(c.code, c.name) }));
}

function poolLabel(pool: string) {
  if (pool === "STATE") return "State Level";
  if (pool.startsWith("HU")) return "Home University";
  if (pool.startsWith("OHU")) return "Other than HU";
  if (pool === "AI") return "All India";
  return pool;
}

const fmtPercentile = (v: number | string | null) =>
  v == null ? "—" : Number(v).toFixed(2);
const fmtRank = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("en-IN");

interface BranchTableRow {
  key: string;
  category: string;
  pool: string;
  rounds: Map<number, CutoffRow>;
}

/** Pivot a branch's rows: one table row per category+pool, columns per CAP round. */
function pivotBranch(rows: CutoffRow[]): BranchTableRow[] {
  const byKey = new Map<string, BranchTableRow>();
  for (const row of rows) {
    const key = `${row.category_code}|${row.allotment_pool}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        key,
        category: row.category ?? row.category_code,
        pool: row.allotment_pool,
        rounds: new Map(),
      };
      byKey.set(key, entry);
    }
    entry.rounds.set(row.cap_round, row);
  }
  return [...byKey.values()].sort((a, b) =>
    a.category === b.category
      ? a.pool.localeCompare(b.pool)
      : a.category.localeCompare(b.category),
  );
}

async function loadCollege(slugParam: string) {
  const code = parseCollegeSlug(slugParam);
  if (!code) notFound();
  const result = await fetchCollegeCutoffs(code);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    // Transient backend failure: fail this render so ISR retries later,
    // instead of serving (and caching) an empty or 404 page.
    throw new Error("Cutoff data is temporarily unavailable.");
  }
  return result.data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<Metadata> {
  const { collegeSlug: slugParam } = await params;
  const data = await loadCollege(slugParam);
  const { college, cutoffs } = data;
  const branches = new Set(cutoffs.map((r) => r.branch)).size;
  const canonical = `${SITE_URL}/cutoffs/${collegeSlug(college.college_code, college.name)}`;
  const title = `${college.name} MHT CET Cutoff ${CUTOFF_YEAR} — Branch-wise Percentile & Rank`;
  const description = `Official MHT-CET ${CUTOFF_YEAR} cutoffs for ${college.name}${college.city ? `, ${college.city}` : ""} (DTE code ${college.college_code}): closing percentiles and ranks for ${branches} branches across all seat categories and CAP Rounds 1–4.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
  };
}

export default async function CollegeCutoffsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug: slugParam } = await params;
  const { college, cutoffs } = await loadCollege(slugParam);

  // Group rows by branch, preserving the backend's alphabetical branch order.
  const byBranch = new Map<string, CutoffRow[]>();
  for (const row of cutoffs) {
    const list = byBranch.get(row.branch);
    if (list) list.push(row);
    else byBranch.set(row.branch, [row]);
  }

  const canonicalSlug = collegeSlug(college.college_code, college.name);
  const pageUrl = `${SITE_URL}/cutoffs/${canonicalSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cutoffs", item: `${SITE_URL}/cutoffs` },
          { "@type": "ListItem", position: 2, name: college.name, item: pageUrl },
        ],
      },
      {
        "@type": "Dataset",
        name: `${college.name} MHT-CET ${CUTOFF_YEAR} Cutoffs`,
        description: `Closing percentiles and ranks for ${college.name} across ${byBranch.size} branches, all seat categories, and CAP Rounds 1–4 of MHT-CET ${CUTOFF_YEAR}.`,
        url: pageUrl,
        creator: { "@type": "Organization", name: "CETHub", url: SITE_URL },
        temporalCoverage: CUTOFF_YEAR,
        spatialCoverage: "Maharashtra, India",
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: "var(--slate-500)" }}>
          <Link href="/cutoffs" style={{ color: "var(--primary-600)" }}>Cutoff Explorer</Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--slate-700)" }}>{college.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">MHT-CET {CUTOFF_YEAR} Cutoffs</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            {college.name}
          </h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "var(--slate-100)", color: "var(--slate-600)", border: "1px solid var(--slate-200)" }}>
              DTE Code: {college.college_code}
            </span>
            {college.city && (
              <span className="px-2.5 py-1 rounded-lg font-semibold"
                style={{ background: "var(--slate-100)", color: "var(--slate-600)", border: "1px solid var(--slate-200)" }}>
                {college.city}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "var(--primary-50)", color: "var(--primary-700)", border: "1px solid var(--primary-200)" }}>
              {byBranch.size} branches · CAP Rounds 1–4
            </span>
          </div>
          <p className="text-sm mt-4 max-w-3xl" style={{ color: "var(--slate-500)" }}>
            Closing percentiles and ranks for every branch, seat category, and CAP round of
            MHT-CET {CUTOFF_YEAR} at {college.name}. A dash (—) means no allotment was published
            for that round. Want to know your chances?{" "}
            <Link href="/predictor" style={{ color: "var(--primary-600)", textDecoration: "underline" }}>
              Try the free college predictor
            </Link>.
          </p>
        </div>

        {/* Branch-wise tables */}
        <div className="space-y-8">
          {[...byBranch.entries()].map(([branch, rows]) => {
            const tableRows = pivotBranch(rows);
            return (
              <section key={branch} aria-label={`${branch} cutoffs`}>
                <h2 className="text-xl font-bold mb-3"
                  style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
                  {branch}
                </h2>
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: "720px" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--slate-200)" }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate-600)" }}>Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate-600)" }}>Seat Type</th>
                          {CAP_ROUNDS.map(r => (
                            <th key={r} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate-600)" }}>
                              Round {r}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map(row => (
                          <tr key={row.key} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                            <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--slate-900)" }}>{row.category}</td>
                            <td className="px-4 py-2.5" style={{ color: "var(--slate-600)" }}>{poolLabel(row.pool)}</td>
                            {CAP_ROUNDS.map(r => {
                              const cell = row.rounds.get(r);
                              return (
                                <td key={r} className="px-4 py-2.5 text-right" style={{ fontFamily: "var(--font-mono)" }}>
                                  {cell ? (
                                    <>
                                      <span className="font-semibold" style={{ color: "var(--slate-900)" }}>
                                        {fmtPercentile(cell.percentile)}
                                      </span>
                                      <span className="block text-xs" style={{ color: "var(--slate-500)" }}>
                                        rank {fmtRank(cell.cutoff_rank)}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ color: "var(--slate-400)" }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {cutoffs.length === 0 && (
          <div className="card py-16 text-center">
            <p className="text-base" style={{ color: "var(--slate-500)" }}>
              No {CUTOFF_YEAR} CAP cutoff records were published for this college.
            </p>
          </div>
        )}

        {/* Cross links */}
        <div className="mt-10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg, var(--primary-950), var(--slate-900))", border: "1px solid var(--slate-700)" }}>
          <p className="text-sm" style={{ color: "var(--slate-300)" }}>
            Compare against every college in Maharashtra, or check which colleges your percentile unlocks.
          </p>
          <div className="flex gap-2">
            <Link href="/cutoffs" className="text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: "var(--bg-primary)", color: "var(--slate-900)" }}>
              Cutoff Explorer
            </Link>
            <Link href="/predictor" className="text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: "var(--primary-600)", color: "#ffffff" }}>
              College Predictor
            </Link>
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
