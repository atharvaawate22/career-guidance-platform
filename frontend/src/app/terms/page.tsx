import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <p className="section-label mb-3">Legal</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
          Terms of Service
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--slate-500)" }}>
          Last updated: 20 May 2026
        </p>
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-7 text-sm leading-7"
          style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-700)" }}
        >
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Informational platform</h2>
            <p>CET Hub provides admission information, historical cutoff analysis, and counseling support for Maharashtra engineering admissions. It is for informational purposes only.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Predictions are not guarantees</h2>
            <p>Cutoff predictions and college suggestions are based on historical data and are not guarantees of admission, seat allotment, rank movement, or CAP outcome.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Consultation bookings</h2>
            <p>Consultation bookings are subject to counselor availability and may be confirmed, rescheduled, or cancelled when operationally required.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Official affiliation</h2>
            <p>CET Hub is not affiliated with DTE Maharashtra, the State Common Entrance Test Cell, or any official CET/CAP admission body.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Limitation of liability</h2>
            <p>Students and guardians remain responsible for verifying official notices, deadlines, eligibility, choices, and admission decisions through official CAP channels. CET Hub is not liable for losses or admission outcomes based on platform guidance.</p>
          </section>
          <p><Link href="/privacy" style={{ color: "var(--primary-600)" }}>Read Privacy Policy</Link></p>
        </div>
      </section>
    </main>
  );
}
