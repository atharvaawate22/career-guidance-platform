/**
 * Server-side FAQ fetch for the homepage, so the questions, answers and
 * FAQPage JSON-LD are in the server HTML. FaqSection used to fetch them in
 * the browser, which left the homepage HTML with no FAQ text and no schema
 * at all — invisible to crawlers and AI answer engines that don't run JS.
 */
import { backendGet } from "@/lib/serverCutoffs";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

/** 1h: FAQs are admin-editable, so a change should show up the same day. */
export const FAQ_REVALIDATE_SECONDS = 3600;

export async function fetchFaqs(): Promise<Faq[]> {
  return (await backendGet<Faq[]>("/api/v1/faqs", FAQ_REVALIDATE_SECONDS)) ?? [];
}
