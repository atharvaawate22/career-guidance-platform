import Link from "next/link";
import CutoffsExplorer from "@/components/CutoffsExplorer";
import { collegeSlug } from "@/lib/collegeSlug";
import { SITE_URL } from "@/lib/site";
import {
  fetchCutoffMeta,
  fetchTopCutoffs,
  type CutoffRow,
} from "@/lib/serverCutoffs";

const CUTOFF_YEAR = "2025";

// ISR: the server-rendered dataset and college directory refresh every 6h,
// matching the backend Redis TTL and the edge-proxy cache window.
export const revalidate = 21600;

const TOP_TABLE_ROWS = 100;

const fmtPercentile = (v: number | string | null) =>
  v == null ? "—" : Number(v).toFixed(2);
const fmtRank = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-IN"));

const CUTOFFS_FAQ: { q: string; a: string }[] = [
  {
    q: "What is an MHT CET cutoff?",
    a: "A cutoff is the closing percentile (and rank) at which a college admitted its last student for a specific branch, seat category, and CAP round. If your percentile is at or above a cutoff, you had a realistic chance of that seat in that round.",
  },
  {
    q: "Which cutoff data does CET Hub cover?",
    a: "CET Hub's explorer covers 90,000+ official MHT-CET 2025 CAP cutoff records published by DTE/State CET Cell Maharashtra — every engineering college, branch, seat category (GOPEN, GOBC, GSC, GST, EWS, TFWS and more), and CAP Rounds 1–4.",
  },
  {
    q: "How do I check the MHT CET 2025 cutoff for a specific college?",
    a: "Use the interactive explorer above with the college filter, or open that college's dedicated cutoff page from the directory below — each page lists branch-wise closing percentiles and ranks for every category and CAP round.",
  },
  {
    q: "Are MHT CET 2026 cutoffs available?",
    a: "2026 CAP counselling has not happened yet, so no 2026 cutoffs exist anywhere. The 2025 cutoffs shown here are the latest official data and the best available guide for 2026 admissions planning.",
  },
];

export default async function CutoffsPage() {
  const [meta, topCutoffs] = await Promise.all([
    fetchCutoffMeta(CUTOFF_YEAR),
    fetchTopCutoffs(CUTOFF_YEAR),
  ]);

  const topRows = topCutoffs.slice(0, TOP_TABLE_ROWS);
  const colleges = (meta?.colleges ?? []).filter(
    (c): c is { code: string; name: string } => !!c.code,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "MHT-CET 2025 CAP Round Engineering Cutoff Dataset",
        description:
          "Structured historical cutoff dataset containing 90,000+ percentile and rank admission records across engineering colleges, branches, categories, and rounds in Maharashtra.",
        url: `${SITE_URL}/cutoffs`,
        keywords: [
          "MHT-CET cutoffs",
          "engineering admission cutoffs Maharashtra",
          "CAP round",
          "CET percentile",
          "CET rank",
        ],
        creator: { "@type": "Organization", name: "CETHub", url: SITE_URL },
        temporalCoverage: "2025",
        spatialCoverage: "Maharashtra, India",
      },
      {
        "@type": "FAQPage",
        mainEntity: CUTOFFS_FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <CutoffsExplorer initialMeta={meta} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-10">

        {/* ── Server-rendered top cutoffs (crawlable) ── */}
        {topRows.length > 0 && (
          <section aria-labelledby="top-cutoffs-heading">
            <div className="mb-4">
              <p className="section-label mb-2">Reference Table</p>
              <h2 id="top-cutoffs-heading" className="text-2xl font-bold mb-1"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
                Highest MHT-CET 2025 Cutoffs — CAP Round 1
              </h2>
              <p className="text-sm" style={{ color: "var(--slate-500)" }}>
                The {topRows.length} most competitive closing cutoffs of CAP Round 1, across all
                colleges, branches, and seat categories. Use the explorer above to search the full
                dataset.
              </p>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: "640px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--slate-200)" }}>
                      {["College", "Branch", "Category", "Percentile", "Closing Rank"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: "var(--slate-600)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topRows.map((row: CutoffRow) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                        <td className="px-4 py-2.5" style={{ color: "var(--slate-900)" }}>
                          {row.college_code ? (
                            <Link href={`/cutoffs/${collegeSlug(row.college_code, row.college_name)}`}
                              style={{ color: "var(--primary-600)" }}>
                              {row.college_name}
                            </Link>
                          ) : row.college_name}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--slate-700)" }}>{row.branch}</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--slate-700)" }}>{row.category ?? row.category_code}</td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--slate-900)", fontFamily: "var(--font-mono)" }}>
                          {fmtPercentile(row.percentile)}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--slate-700)", fontFamily: "var(--font-mono)" }}>
                          {fmtRank(row.cutoff_rank)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── College directory (crawlable internal links) ── */}
        {colleges.length > 0 && (
          <section aria-labelledby="college-directory-heading">
            <div className="mb-4">
              <p className="section-label mb-2">Browse by College</p>
              <h2 id="college-directory-heading" className="text-2xl font-bold mb-1"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
                MHT-CET 2025 Cutoffs by College
              </h2>
              <p className="text-sm" style={{ color: "var(--slate-500)" }}>
                Branch-wise closing percentiles and ranks for every CAP round — {colleges.length} engineering colleges across Maharashtra.
              </p>
            </div>
            <div className="card p-5">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm list-none">
                {colleges.map(c => (
                  <li key={c.code}>
                    <Link href={`/cutoffs/${collegeSlug(c.code, c.name)}`}
                      style={{ color: "var(--primary-600)" }}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── FAQ (matches FAQPage JSON-LD) ── */}
        <section aria-labelledby="cutoffs-faq-heading">
          <div className="mb-4">
            <p className="section-label mb-2">FAQ</p>
            <h2 id="cutoffs-faq-heading" className="text-2xl font-bold"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              MHT-CET Cutoff Questions, Answered
            </h2>
          </div>
          <div className="space-y-3">
            {CUTOFFS_FAQ.map(({ q, a }) => (
              <details key={q} className="card p-5">
                <summary className="font-semibold cursor-pointer" style={{ color: "var(--slate-900)" }}>{q}</summary>
                <p className="text-sm mt-3" style={{ color: "var(--slate-600)" }}>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
