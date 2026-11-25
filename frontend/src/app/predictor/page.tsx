import PredictorForm from "@/components/PredictorForm";
import { CUTOFF_YEAR } from "@/lib/dataYear";

/**
 * Server component shell for the predictor: the page header and FAQ are
 * server-rendered (crawlable without JS), while the interactive prediction form
 * hydrates on top as a client component. The separate Methodology / CAP rounds /
 * Seat categories sections were removed (Nov 2026): they repeated the FAQ below
 * them, and their unique facts were folded into the FAQ answers.
 */

/**
 * Questions students actually have on this page (Nov 2026 rewrite). The old
 * set mixed real questions with keyword-shaped ones ("How does the MHT CET
 * college predictor work?") and filler ("Is it free?"). Every answer here is
 * checked against the predictor's real behaviour: the tier window is
 * h = 50 x sqrt(rank) (backend predictor.service.ts getDynamicThresholds), the
 * percentile-to-rank estimate interpolates CAP Round I closing pairs
 * (predictor.repository.ts estimateRankFromPercentile), and results are
 * capped per tier (PER_TIER_LIMIT = 200).
 */
const PREDICTOR_FAQ: { q: string; a: string }[] = [
  {
    q: "What do Safe, Target and Dream mean?",
    a: `They compare your rank with each seat's official ${CUTOFF_YEAR} CAP Round I closing rank. Safe: the seat closed at a noticeably larger rank number than yours (a lower merit position), so you would have cleared it comfortably. Target: it closed close to your rank, either side. Dream: it closed at a smaller rank number than yours (a higher merit position), so you would have needed a little luck. The band scales with your rank: at rank 10,000, Dream covers seats that closed between ranks 5,000 and 7,500, Target 7,500 to 11,500, and Safe 11,500 to 15,000.`,
  },
  {
    q: "Should I enter my percentile or my rank?",
    a: `Your rank, as soon as you have it. A percentile is converted to an estimated rank by interpolating between the nearest percentile and rank pairs in the official ${CUTOFF_YEAR} Round I data, which is close but not exact, especially at very high percentiles where many students share almost the same score.`,
  },
  {
    q: "Why don't I see colleges that would be easy for me?",
    a: "The predictor only shows seats near your rank: roughly from one band better than you to one band worse (the same bands used for Safe, Target and Dream). Seats that closed at rank numbers far larger than yours are near-certain for you, so they are left out to keep the list useful. Your category, gender and any branch or city preferences narrow it further. To see everything, use the cutoff explorer, which lists every seat.",
  },
  {
    q: `Is ${CUTOFF_YEAR} data useful for my ${Number(CUTOFF_YEAR) + 1} attempt?`,
    a: `Yes, as a guide to which colleges and branches are within reach, not as exact numbers. Cutoffs move every year with exam difficulty, the number of candidates and seat changes. COEP's Computer Science (state-level OPEN), for example, closed at rank 243 in Round I of 2025 and at rank 150 in 2026. Treat your Safe list as realistic and your Dream list as a stretch, and check again when the ${Number(CUTOFF_YEAR) + 1} cutoffs are published during CAP.`,
  },
  {
    q: "Why does the predictor use CAP Round I cutoffs?",
    a: "Round I is the first and most complete round, when almost every seat is still available, so it is the most reliable baseline. Later rounds usually close at larger rank numbers as seats free up, but not always, so a college that looks reachable only in Round IV is a risk, not a plan.",
  },
  {
    q: "Can the predictor guarantee my admission?",
    a: `No. It shows where you would have stood against official ${CUTOFF_YEAR} cutoffs. Your actual seat depends on this year's cutoffs, your option form and which seats you are eligible for. Use it to build a balanced option list, not as a promise.`,
  },
];

export default function PredictorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREDICTOR_FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Page header (server-rendered) */}
        <div className="mb-8">
          <p className="section-label mb-2">MHT-CET {CUTOFF_YEAR}</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            College Predictor
          </h1>
          <p className="text-sm" style={{ color: "var(--slate-500)" }}>
            Based on {CUTOFF_YEAR} CAP Round I cutoffs. Enter your percentile or rank to see eligible colleges.
            Results are indicative, not guaranteed.
          </p>
        </div>

        {/* Interactive form (client component, hydrates on top of the shell) */}
        <PredictorForm />

        {/* ── FAQ (matches FAQPage JSON-LD) ── */}
        <section aria-labelledby="predictor-faq-heading" className="mt-12">
          <div className="mb-4">
            <p className="section-label mb-2">FAQ</p>
            <h2 id="predictor-faq-heading" className="text-2xl font-bold"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              College Predictor Questions, Answered
            </h2>
          </div>
          <div className="space-y-3">
            {PREDICTOR_FAQ.map(({ q, a }) => (
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
