import PredictorForm from "@/components/PredictorForm";
import { BOOKINGS_ENABLED } from "@/lib/features";
import { CUTOFF_YEAR } from "@/lib/dataYear";
import { PREDICTOR_RECORDS_LABEL } from "@/lib/siteStats";

/**
 * Server component shell for the predictor: the page header and FAQ are
 * server-rendered (crawlable without JS), while the interactive prediction form
 * hydrates on top as a client component. The separate Methodology / CAP rounds /
 * Seat categories sections were removed (Nov 2026): they repeated the FAQ below
 * them, and their unique facts were folded into the FAQ answers.
 */

const PREDICTOR_FAQ: { q: string; a: string }[] = [
  {
    q: "How does the MHT CET college predictor work?",
    a: `Enter your MHT-CET percentile or CAP rank, category, and gender. The predictor compares your effective rank against ${PREDICTOR_RECORDS_LABEL} official ${CUTOFF_YEAR} CAP Round I closing cutoffs and sorts eligible colleges into Safe (comfortably within cutoff), Target (realistic), and Dream (competitive but possible) tiers. All of it is official DTE Maharashtra data, not surveys or self-reported results — you can check any number in the cutoff explorer.`,
  },
  {
    q: "Is the CET Hub college predictor free?",
    a: BOOKINGS_ENABLED
      ? "Yes — the predictor, the full cutoff explorer, and counseling session bookings are all completely free."
      : "Yes — the predictor and the full cutoff explorer are completely free.",
  },
  {
    q: "Should I enter my percentile or my rank?",
    a: `Rank is more accurate. If you enter a percentile, the predictor estimates your rank from official ${CUTOFF_YEAR} percentile-to-rank data; once your official CET rank is published, use that instead.`,
  },
  {
    q: "Can the predictor guarantee my admission?",
    a: `No predictor can. Cutoffs shift every year with exam difficulty, applicant numbers, and seat-matrix changes. Predictions are data-driven estimates based on ${CUTOFF_YEAR} CAP Round I cutoffs — use them to build a smart option list, not as a guarantee.`,
  },
  {
    q: "Does it account for category, gender, and minority seats?",
    a: "Yes. Predictions respect your seat eligibility: category tiers (GOPEN, GOBC, GSC, GST, EWS, and more), gender rules (ladies vs gender-neutral seats), TFWS, and minority type/group quotas.",
  },
  {
    q: "What are MHT-CET CAP rounds, and which one should I predict for?",
    a: "The State CET Cell runs Maharashtra's engineering admissions through four Centralized Admission Process (CAP) rounds. Each round has its own closing percentile and rank per college, branch, and category — a seat that closes in Round I may close lower (be more accessible) by Round III or IV as higher-ranked candidates lock in seats elsewhere. This predictor uses CAP Round I closing cutoffs, the most conservative and reliable baseline, since later rounds only get easier to clear.",
  },
  {
    q: "What's the difference between OPEN, TFWS, and category seats?",
    a: "OPEN (state-level general category) seats are open to every candidate regardless of caste or category. Reservation categories — OBC, SEBC, SC, ST, VJ, NT1/NT2/NT3, and EWS — have their own separate, usually lower, cutoffs reserved for candidates who qualify. TFWS (Tuition Fee Waiver Scheme) is a separate merit-based scheme, not a caste category, that waives tuition fees for eligible general-category candidates regardless of income. Seats are also split into gender-neutral and ladies-only pools, and Defence and PwD quotas layer on top as additional reserved seats. Minority (MI) seats are reserved at linguistic or religious minority institutions.",
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
