import Link from "next/link";

const contactEmail = "support@cethub.in";

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <p className="section-label mb-3">Legal</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
          Privacy Policy
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--slate-500)" }}>
          Last updated: 21 July 2026
        </p>
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-7 text-sm leading-7"
          style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-700)" }}
        >
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Data we collect</h2>
            <p>CET Hub may collect name, email address, phone number, MHT-CET percentile, admission category, branch preferences, consultation booking details, guide download details, and messages you send to our chatbot assistant (see the Chatbot and WhatsApp assistant section below).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Why we collect it</h2>
            <p>We use this data for consultation booking, predictor usage, guide downloads, lead tracking, and admission guidance follow-up.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Booking records are retained for 2 years.</li>
              <li>Guide download leads are retained for 1 year.</li>
              <li>Predictor usage is stateless and is not stored as a predictor history.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Chatbot and WhatsApp assistant</h2>
            <p>CET Hub provides a rule-based assistant on this website and, when you choose to message us there, on WhatsApp. It answers questions about cutoffs, CAP dates, documents, and the admission process. To improve the answers it can give, we keep a log of questions the assistant could not answer:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>On the website, these logged questions are stored without any identifier — they are not linked to you.</li>
              <li>On WhatsApp, a question the assistant could not answer is stored together with the WhatsApp number it came from, because WhatsApp attaches it to every message. We use it only to understand and follow up on unanswered questions, never to message you first — every WhatsApp conversation begins with a message you send us.</li>
            </ul>
            <p className="mt-2">We do not use this assistant to provide guaranteed or official admission decisions, and its answers should be verified against official sources. The messages you send are processed to generate a reply and, in the limited case above, logged to improve coverage.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Sharing and storage</h2>
            <p>We do not sell student data to third parties. Data is stored on servers in India or with providers that support compliance with Indian law. Operational providers may be used for hosting, email, calendar scheduling, error tracking, and — for the WhatsApp assistant — the WhatsApp Business Platform (Meta).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Your rights</h2>
            <p>You can request deletion of your personal data by emailing <a href={`mailto:${contactEmail}`} style={{ color: "var(--primary-600)" }}>{contactEmail}</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--slate-900)" }}>Official affiliation</h2>
            <p>CET Hub is independent and is not affiliated with DTE Maharashtra, the State Common Entrance Test Cell, or any official CAP admission authority.</p>
          </section>
          <p><Link href="/terms" style={{ color: "var(--primary-600)" }}>Read Terms of Service</Link></p>
        </div>
      </section>
    </main>
  );
}
