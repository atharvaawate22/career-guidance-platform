import Link from "next/link";
import PredictorForm from "@/components/PredictorForm";
import { BOOKINGS_ENABLED } from "@/lib/features";

/**
 * Server component shell for the predictor: the page header, methodology
 * explainer, and FAQ are all server-rendered (crawlable without JS), while the
 * interactive prediction form hydrates on top as a client component.
 */

const PREDICTOR_FAQ: { q: string; a: string }[] = [
  {
    q: "How does the MHT CET college predictor work?",
    a: "Enter your MHT-CET percentile or CAP rank, category, and gender. The predictor compares your effective rank against 90,000+ official 2025 CAP Round I closing cutoffs and sorts eligible colleges into Safe (comfortably within cutoff), Target (realistic), and Dream (competitive but possible) tiers.",
  },
  {
    q: "Is the CET Hub college predictor free?",
    a: BOOKINGS_ENABLED
      ? "Yes — the predictor, the full cutoff explorer, and counseling session bookings are all completely free."
      : "Yes — the predictor and the full cutoff explorer are completely free.",
  },
  {
    q: "Should I enter my percentile or my rank?",
    a: "Rank is more accurate. If you enter a percentile, the predictor estimates your rank from official 2025 percentile-to-rank data; once your official CET rank is published, use that instead.",
  },
  {
    q: "Can the predictor guarantee my admission?",
    a: "No predictor can. Cutoffs shift every year with exam difficulty, applicant numbers, and seat-matrix changes. Predictions are data-driven estimates based on 2025 CAP Round I cutoffs — use them to build a smart option list, not as a guarantee.",
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
    a: "OPEN (state-level general category) seats are open to every candidate regardless of caste or category. Reservation categories — OBC, SEBC, SC, ST, VJ, NT1/NT2/NT3, and EWS — have their own separate, usually lower, cutoffs reserved for candidates who qualify. TFWS (Tuition Fee Waiver Scheme) is a separate merit-based scheme, not a caste category, that waives tuition fees for eligible general-category candidates regardless of income. Defence and PwD quotas layer on top of these as additional reserved seats.",
  },
];

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: "Enter your score",
    body: "Percentile or CAP rank — rank gives the most accurate results once published.",
  },
  {
    title: "Set your profile",
    body: "Category, gender, and optional minority status decide exactly which seats you are eligible for.",
  },
  {
    title: "Get tiered results",
    body: "Colleges are classified as Safe, Target, or Dream by comparing your rank against official 2025 closing cutoffs.",
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
          <p className="section-label mb-2">MHT-CET 2025</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            College Predictor
          </h1>
          <p className="text-sm" style={{ color: "var(--slate-500)" }}>
            Based on 2025 CAP Round I cutoffs. Enter your percentile or rank to see eligible colleges.
            Results are indicative, not guaranteed.
          </p>
        </div>

        {/* Interactive form (client component, hydrates on top of the shell) */}
        <PredictorForm />

        {/* ── Server-rendered explainer (crawlable) ── */}
        <section aria-labelledby="predictor-how-heading" className="mt-12">
          <div className="mb-4">
            <p className="section-label mb-2">Methodology</p>
            <h2 id="predictor-how-heading" className="text-2xl font-bold mb-1"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              How the MHT-CET College Predictor Works
            </h2>
            <p className="text-sm max-w-3xl" style={{ color: "var(--slate-500)" }}>
              Every prediction is computed against 90,000+ official DTE Maharashtra CAP cutoff
              records from 2025 — not surveys or self-reported data. Explore the underlying numbers
              in the <Link href="/cutoffs" style={{ color: "var(--primary-600)", textDecoration: "underline" }}>cutoff explorer</Link>.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="card p-5">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold mb-3"
                  style={{ background: "var(--primary-600)", color: "#ffffff" }}>
                  {i + 1}
                </div>
                <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--slate-900)" }}>{step.title}</h3>
                <p className="text-sm" style={{ color: "var(--slate-600)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Server-rendered CAP round explainer (crawlable) ── */}
        <section aria-labelledby="predictor-caprounds-heading" className="mt-12">
          <div className="mb-4">
            <p className="section-label mb-2">CAP Admission Process</p>
            <h2 id="predictor-caprounds-heading" className="text-2xl font-bold mb-1"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              How MHT-CET CAP Rounds Affect Your Prediction
            </h2>
            <p className="text-sm max-w-3xl" style={{ color: "var(--slate-500)" }}>
              Maharashtra&apos;s State CET Cell allots engineering seats over four Centralized
              Admission Process (CAP) rounds, not a single pass. In each round, every college,
              branch, and category has its own closing percentile — the rank of the last
              candidate admitted. As candidates confirm seats and move on, the closing cutoff for
              the same seat can relax in the next round. CAP Round I is the first and most
              competitive round, so it&apos;s also the most conservative baseline for a
              prediction: if you&apos;re eligible for a college on Round I cutoffs, you&apos;re
              very likely still eligible in later rounds. That&apos;s why this predictor is built
              on 2025 CAP Round I closing data — the safest starting point for shortlisting
              colleges before the current year&apos;s counselling begins.
            </p>
          </div>
        </section>

        {/* ── Server-rendered seat category explainer (crawlable) ── */}
        <section aria-labelledby="predictor-categories-heading" className="mt-12">
          <div className="mb-4">
            <p className="section-label mb-2">Seat Categories</p>
            <h2 id="predictor-categories-heading" className="text-2xl font-bold mb-1"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              MHT-CET Seat Categories the Predictor Checks
            </h2>
            <p className="text-sm max-w-3xl mb-4" style={{ color: "var(--slate-500)" }}>
              Every seat in MHT-CET admissions belongs to a specific category, and each has its
              own closing cutoff. Picking the right category in the form above is what makes a
              prediction accurate.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--slate-900)" }}>OPEN (General)</h3>
              <p className="text-sm" style={{ color: "var(--slate-600)" }}>
                State-level general category, open to every candidate regardless of caste. Usually
                the most competitive cutoffs.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--slate-900)" }}>Reservation Categories</h3>
              <p className="text-sm" style={{ color: "var(--slate-600)" }}>
                OBC, SEBC, SC, ST, VJ, NT1, NT2, NT3, and EWS each have their own reserved seats
                and separate, typically more accessible, closing cutoffs.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--slate-900)" }}>TFWS &amp; Minority</h3>
              <p className="text-sm" style={{ color: "var(--slate-600)" }}>
                TFWS (Tuition Fee Waiver Scheme) is a merit-based fee waiver, not a caste category.
                Minority (MI) seats are reserved at linguistic or religious minority institutions.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--slate-900)" }}>Gender &amp; Other Quotas</h3>
              <p className="text-sm" style={{ color: "var(--slate-600)" }}>
                Seats are further split into Gender-Neutral and Ladies-Only pools, with additional
                Defence and PwD (Persons with Disability) reservations layered on top.
              </p>
            </div>
          </div>
        </section>

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
