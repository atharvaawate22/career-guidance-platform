/**
 * Server-side fetches for the Resources and Guides pages, so their lists are
 * in the server HTML. Both pages used to fetch in the browser, which left the
 * HTML with no resource or guide titles at all (Resources literally rendered
 * "All 0") — invisible to crawlers and AI answer engines that don't run JS.
 */
import { backendGet } from "@/lib/serverCutoffs";

export interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  created_at?: string;
}

/** 1h: both lists are admin-editable and the weekly notices routine adds resources. */
export const CONTENT_REVALIDATE_SECONDS = 3600;

export async function fetchResources(): Promise<Resource[]> {
  return (await backendGet<Resource[]>("/api/v1/resources", CONTENT_REVALIDATE_SECONDS)) ?? [];
}

export async function fetchGuides(): Promise<Guide[]> {
  return (await backendGet<Guide[]>("/api/v1/guides", CONTENT_REVALIDATE_SECONDS)) ?? [];
}
