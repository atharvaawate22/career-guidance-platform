import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { CAP_SCHEDULE_YEAR } from "@/lib/dataYear";
import {
  fetchCapSchedule,
  type CapScheduleEvent,
  type CapScheduleEventStatus,
} from "@/lib/serverCapSchedule";

// ISR: admin edits (a revised date, a "results are out" note) should reach
// the live URL in minutes, not on the next deploy — see serverCapSchedule.ts.
export const revalidate = 300;

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Dates are stored as plain 'YYYY-MM-DD' strings (see
 * backend/src/config/database.ts for why). `new Date(dateStr)` parses a
 * date-only string as UTC midnight, and IST is ahead of UTC, so formatting it
 * forward into Asia/Kolkata always lands on the same calendar day — safe.
 * Do not swap this for a bare toLocaleDateString without that explicit zone.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "To be announced";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function effectiveDate(event: CapScheduleEvent): string | null {
  return event.revised_date ?? event.planned_date;
}

/** Every value this event's date has ever held, chronological, current last. */
function dateHistory(event: CapScheduleEvent): string[] {
  const superseded = [...event.revision_history]
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
    .map((r) => r.previous_date)
    .filter((d): d is string => d !== null);
  const current = effectiveDate(event);
  return current ? [...superseded, current] : superseded;
}

const STATUS_STYLE: Record<
  CapScheduleEventStatus,
  { label: string; bg: string; color: string }
> = {
  upcoming: { label: "Upcoming", bg: "var(--slate-100)", color: "var(--slate-600)" },
  today: { label: "Today", bg: "var(--primary-50)", color: "var(--primary-700)" },
  completed: { label: "Completed", bg: "var(--success-light)", color: "var(--success-dark)" },
  postponed: { label: "Postponed", bg: "var(--warning-light)", color: "var(--warning-dark)" },
};

/** The moments students actually want a "check my chances" nudge. */
const isChancesMoment = (event: CapScheduleEvent) =>
  event.event_label.includes("Seat Allotment Result") || event.round_label === "Post-CAP";

function buildFaqs(events: CapScheduleEvent[]) {
  return events.map((event) => {
    const question = `When is ${event.round_label} — ${event.event_label}?`;
    const date = effectiveDate(event);
    let answer: string;
    if (event.result_note) {
      answer = event.result_note;
    } else if (date) {
      const revisedNote =
        event.revised_date && event.planned_date && event.revised_date !== event.planned_date
          ? ` (revised from the originally planned ${formatDate(event.planned_date)})`
          : "";
      answer = `${event.event_label} for ${event.round_label} is scheduled for ${formatDate(date)}${revisedNote}.`;
    } else {
      answer = `The official date for ${event.event_label} (${event.round_label}) has not been released yet by DTE Maharashtra. This page is updated directly the moment it is.`;
    }
    return { question, answer };
  });
}

export default async function CapSchedulePage() {
  const timeline = await fetchCapSchedule(CAP_SCHEDULE_YEAR);
  const events = timeline?.events ?? [];

  const rounds = new Map<string, CapScheduleEvent[]>();
  for (const event of events) {
    const list = rounds.get(event.round_label);
    if (list) list.push(event);
    else rounds.set(event.round_label, [event]);
  }

  const pageUrl = `${SITE_URL}/mht-cet-cap-2026-schedule`;
  const faqs = buildFaqs(events);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
      ...events
        .filter((e) => effectiveDate(e))
        .map((e) => ({
          "@type": "Event",
          name: `MHT-CET CAP ${CAP_SCHEDULE_YEAR} — ${e.round_label}: ${e.event_label}`,
          startDate: effectiveDate(e),
          eventStatus:
            e.status === "postponed"
              ? "https://schema.org/EventPostponed"
              : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          location: { "@type": "VirtualLocation", url: pageUrl },
          organizer: { "@type": "Organization", name: "CETHub", url: SITE_URL },
          url: pageUrl,
        })),
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">MHT-CET {CAP_SCHEDULE_YEAR} Admissions</p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
          >
            MHT-CET CAP {CAP_SCHEDULE_YEAR} Schedule
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--slate-500)" }}>
            Registration, merit list, and every CAP round — option form, seat allotment result,
            and seat acceptance — through the post-CAP admission cutoff date. This is a single,
            continuously updated page: when DTE Maharashtra revises a date or declares a result,
            we edit it here rather than posting a new article.
          </p>
          {timeline?.last_updated && (
            <p
              className="text-xs font-semibold mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: "var(--primary-50)",
                color: "var(--primary-700)",
                border: "1px solid var(--primary-200)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Last updated {formatDateTime(timeline.last_updated)} IST
            </p>
          )}
        </div>

        {events.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-base" style={{ color: "var(--slate-500)" }}>
              The schedule is temporarily unavailable. Check back shortly, or see{" "}
              <Link href="/updates" style={{ color: "var(--primary-600)", textDecoration: "underline" }}>
                Latest Updates
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {/* Quick jump nav — also gives each round an individually crawlable, deep-linkable anchor */}
            <nav aria-label="Jump to round" className="flex flex-wrap gap-2 mb-8">
              {[...rounds.keys()].map((label) => (
                <a
                  key={label}
                  href={`#${slugify(label)}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: "var(--bg-primary)", color: "var(--slate-600)", border: "1px solid var(--slate-200)" }}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="space-y-8">
              {[...rounds.entries()].map(([roundLabel, roundEvents]) => (
                <section key={roundLabel} id={slugify(roundLabel)} aria-label={`${roundLabel} schedule`}>
                  <h2
                    className="text-xl font-bold mb-3"
                    style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
                  >
                    {roundLabel}
                  </h2>
                  <div className="card" style={{ overflow: "hidden" }}>
                    {roundEvents.map((event, idx) => {
                      const style = STATUS_STYLE[event.status];
                      const history = dateHistory(event);
                      const showCta = isChancesMoment(event);
                      return (
                        <div
                          key={event.id}
                          className="p-5"
                          style={{ borderTop: idx > 0 ? "1px solid var(--slate-100)" : undefined }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-bold" style={{ color: "var(--slate-900)" }}>
                                {event.event_label}
                              </h3>
                              <p className="text-sm mt-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                                {history.length > 1 ? (
                                  <>
                                    {history.slice(0, -1).map((d, i) => (
                                      <span key={i}>
                                        <span style={{ color: "var(--slate-400)", textDecoration: "line-through" }}>
                                          {formatDate(d)}
                                        </span>
                                        <span style={{ color: "var(--slate-400)" }}> → </span>
                                      </span>
                                    ))}
                                    <span className="font-semibold" style={{ color: "var(--slate-900)" }}>
                                      {formatDate(history[history.length - 1])}
                                    </span>
                                  </>
                                ) : (
                                  <span
                                    className="font-semibold"
                                    style={{ color: history.length ? "var(--slate-900)" : "var(--slate-400)" }}
                                  >
                                    {formatDate(history[0] ?? null)}
                                  </span>
                                )}
                              </p>
                              {event.notes && (
                                <p className="text-xs mt-2" style={{ color: "var(--slate-500)" }}>
                                  {event.notes}
                                </p>
                              )}
                              {event.result_note && (
                                <p className="text-xs mt-2 font-medium" style={{ color: "var(--primary-700)" }}>
                                  {event.result_note}
                                  {event.result_url && (
                                    <>
                                      {" "}
                                      <a
                                        href={event.result_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--primary-600)", textDecoration: "underline" }}
                                      >
                                        Official notice
                                      </a>
                                    </>
                                  )}
                                </p>
                              )}
                            </div>
                            <span
                              className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                              style={{ background: style.bg, color: style.color }}
                            >
                              {style.label}
                            </span>
                          </div>
                          {showCta && (
                            <div
                              className="mt-4 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                              style={{ background: "linear-gradient(135deg, var(--primary-950), var(--slate-900))" }}
                            >
                              <p className="text-xs" style={{ color: "var(--slate-300)" }}>
                                Check your chances for {roundLabel} with your MHT-CET percentile.
                              </p>
                              <div className="flex gap-2 shrink-0">
                                <Link
                                  href="/predictor"
                                  className="text-xs font-bold px-3.5 py-2 rounded-lg"
                                  style={{ background: "var(--primary-600)", color: "#ffffff" }}
                                >
                                  Check my chances →
                                </Link>
                                <Link
                                  href="/cutoffs"
                                  className="text-xs font-bold px-3.5 py-2 rounded-lg"
                                  style={{ background: "var(--bg-primary)", color: "var(--slate-900)" }}
                                >
                                  Cutoffs
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* FAQ — visible content backing the FAQPage structured data below */}
            <section aria-label="Frequently asked questions" className="mt-12">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
              >
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map(({ question, answer }, i) => (
                  <details key={i} className="card p-4" style={{ borderColor: "var(--slate-200)" }}>
                    <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--slate-900)" }}>
                      {question}
                    </summary>
                    <p className="text-sm mt-2" style={{ color: "var(--slate-600)" }}>
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {events.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </div>
  );
}
