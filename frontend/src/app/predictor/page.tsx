import Link from "next/link";
import PredictorForm from "@/components/PredictorForm";

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
    a: "Yes — the predictor, the full cutoff explorer, and counseling session bookings are all completely free.",
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
