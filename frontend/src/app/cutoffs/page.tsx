import Link from "next/link";
import { CUTOFF_RECORDS_LABEL } from "@/lib/siteStats";
import CutoffsExplorer from "@/components/CutoffsExplorer";
import ExpandableRows from "@/components/ExpandableRows";
import { collegeSlug } from "@/lib/collegeSlug";
import { SITE_URL } from "@/lib/site";
import {
  fetchCutoffMeta,
  fetchTopCutoffs,
  type CutoffRow,
} from "@/lib/serverCutoffs";

import {
  CUTOFF_YEAR,
  academicYearSpan,
  isCompleteYear,
  roundsRangeLabel,
} from "@/lib/dataYear";

// ISR: the server-rendered dataset and college directory refresh every 6h,
// matching the backend Redis TTL and the edge-proxy cache window.
export const revalidate = 21600;

const TOP_TABLE_ROWS = 100;
/** Rows of the top-cutoffs table shown before "Show all" (the rest stay in the HTML, just hidden). */
const TOP_TABLE_PREVIEW = 10;

const fmtPercentile = (v: number | string | null) =>
  v == null ? "—" : Number(v).toFixed(2);
const fmtRank = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-IN"));

/**
 * What students actually wonder while reading this table (Nov 2026 rewrite;
 * the old three were a definition, a self-description and "use the filters
 * above"). Examples are real rows from the cutoffs table (GOPENS, stage I):
 * COEP CSE Round I closing rank 243 (2025) and 150 (2026); WCE Sangli
 * Electrical 2026: 4,332 (R1), 3,836 (R3), 4,558 (R4).
 */
const BASE_CUTOFFS_FAQ: { q: string; a: string }[] = [
  {
    q: "A branch shows many cutoffs. Which ones apply to me?",
    a: "Each row is a separate pool of seats with its own last admitted rank. Only the rows that match you apply: your category (OPEN, OBC, SC and so on); your gender, because codes starting with L are ladies-only seats while G seats are open to everyone; and the seat type shown on each result, which is State Level (any Maharashtra candidate), Home University (candidates from that college's university region) or Other Than Home University. All India rows are for candidates admitted through the All India quota. Filter by your category and gender to hide the rest.",
  },
  {
    q: "Should I look at Round I or Round IV cutoffs?",
    a: `Start with Round I: almost every seat is still available then, so it is the most reliable picture of how competitive a seat is. Later rounds usually close at larger rank numbers as students move or drop out, but not always. Walchand Sangli's Electrical Engineering (state-level OPEN) closed at rank 4,332 in Round I of ${CUTOFF_YEAR}, tightened to 3,836 in Round III, then eased to 4,558 in Round IV. Use Round IV to see a seat's last chance, not as your baseline.`,
  },
  {
    q: "Should I compare my percentile or my rank with the cutoff?",
    a: "Your rank. Percentiles are normalised across exam sessions and many students share nearly the same one, so two cutoffs can show the same percentile but very different ranks. The closing rank is the exact merit position of the last student admitted, so if your rank number is smaller than a seat's closing rank, you would have cleared it.",
  },
  {
    q: "How much do cutoffs change from one year to the next?",
    a: `Enough that last year's number is a guide, not a promise. COEP's Computer Science (state-level OPEN) closed at rank 243 in Round I of 2025 and at rank 150 in ${CUTOFF_YEAR}. To see how a seat moved, switch the Academic Year filter in the explorer above and compare the same college, branch and category across years.`,
  },
  {
    q: "Why is there no cutoff for my category at a college?",
    a: "Either the college has no seat for that category in that branch, or no candidate was admitted to it in that round, so there is no closing rank to report. Minority institutions also reserve many of their seats for their own minority group. Try a different round, or check the seat matrix linked under Resources.",
  },
];

export default async function CutoffsPage() {
  const [meta, topCutoffs] = await Promise.all([
    fetchCutoffMeta(CUTOFF_YEAR),
    fetchTopCutoffs(CUTOFF_YEAR),
  ]);

  // Whichever loaded year isn't the complete, final dataset yet — drives the
  // "are next cycle's cutoffs available" FAQ below without hardcoding which
  // year that is. Once it reaches all 4 rounds it stops qualifying, and the
  // FAQ item quietly stops appearing (there's nothing "in progress" to ask about).
  const inProgressYear = (meta?.availableRounds ?? []).find(
    (a) => String(a.year) !== CUTOFF_YEAR && !isCompleteYear(a.rounds),
  );
  const CUTOFFS_FAQ = [
    ...BASE_CUTOFFS_FAQ,
    ...(inProgressYear
      ? [
          {
            q: `Are MHT CET ${inProgressYear.year} cutoffs available?`,
            a: `CAP ${roundsRangeLabel(inProgressYear.rounds)} cutoffs for ${academicYearSpan(String(inProgressYear.year))} (State/MH quota) are now available — switch the Academic Year filter in the explorer above to see them. Only ${inProgressYear.rounds.length} of 4 CAP rounds have been published so far, and cutoffs typically shift across rounds as seats are reallocated, so the ${CUTOFF_YEAR} cutoffs (the complete, final dataset across all 4 rounds) remain the best reference for admissions planning until ${academicYearSpan(String(inProgressYear.year))} finalizes.`,
          },
        ]
      : []),
  ];

  const topRows = topCutoffs.slice(0, TOP_TABLE_ROWS);
  const colleges = (meta?.colleges ?? []).filter(
    (c): c is { code: string; name: string } => !!c.code,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: `MHT-CET ${CUTOFF_YEAR} CAP Round Engineering Cutoff Dataset`,
        description:
          `Structured historical cutoff dataset containing ${CUTOFF_RECORDS_LABEL} percentile and rank admission records across engineering colleges, branches, categories, and rounds in Maharashtra.`,
        url: `${SITE_URL}/cutoffs`,
        keywords: [
          "MHT-CET cutoffs",
          "engineering admission cutoffs Maharashtra",
          "CAP round",
          "CET percentile",
          "CET rank",
        ],
        creator: { "@type": "Organization", name: "CETHub", url: SITE_URL },
        temporalCoverage: CUTOFF_YEAR,
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
                Highest MHT-CET {CUTOFF_YEAR} Cutoffs — CAP Round 1
              </h2>
              <p className="text-sm" style={{ color: "var(--slate-500)" }}>
                The {topRows.length} most competitive closing cutoffs of CAP Round 1, across all
                colleges, branches, and seat categories. Use the explorer above to search the full
                dataset.
              </p>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <ExpandableRows total={topRows.length} previewCount={TOP_TABLE_PREVIEW}>
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
                    {topRows.map((row: CutoffRow, i: number) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--slate-100)" }}
                        className={i >= TOP_TABLE_PREVIEW ? "group-data-[collapsed=true]:hidden" : undefined}>
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
              </ExpandableRows>
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
                MHT-CET {CUTOFF_YEAR} Cutoffs by College
              </h2>
              <p className="text-sm" style={{ color: "var(--slate-500)" }}>
                Branch-wise closing percentiles and ranks for every CAP round — {colleges.length} engineering colleges across Maharashtra.
              </p>
            </div>
            {/* Native <details>: the links stay in the server HTML while collapsed
                (crawlable, and Chrome's find-in-page opens it on a match). */}
            <details className="card group">
              <summary
                className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold"
                style={{ color: "var(--primary-600)" }}
              >
                <span>
                  <span className="group-open:hidden">Show all {colleges.length} colleges (A–Z)</span>
                  <span className="hidden group-open:inline">Hide college list</span>
                </span>
                <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
              </summary>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm list-none px-5 pb-5 pt-1">
                {colleges.map(c => (
                  <li key={c.code}>
                    <Link href={`/cutoffs/${collegeSlug(c.code, c.name)}`}
                      style={{ color: "var(--primary-600)" }}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
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
