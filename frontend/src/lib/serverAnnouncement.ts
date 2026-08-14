/**
 * Server-side data access for the site announcement banner.
 *
 * Same shape as serverCapSchedule.ts: runs only in server components, leans on
 * the Next.js data cache, and never hard-fails on a fetch error. This exists
 * because AnnouncementBanner used to fetch its content entirely client-side
 * (a `useEffect` on mount), which meant the fixed, above-the-fold banner text
 * could only paint after JS hydration plus a network round trip — PageSpeed
 * flagged it as the LCP element with ~1s of pure "render delay" despite a
 * 0ms TTFB, since it wasn't in the initial HTML at all. Fetching it here and
 * passing it down as SSR'd initial state removes that stall.
 */
import { API_BASE_URL } from "@/lib/apiBaseUrl";

const BACKEND = API_BASE_URL;
const PROXY_TOKEN = process.env.INTERNAL_PROXY_TOKEN || "";

/** Short relative to most content TTLs — an admin toggling/editing the banner
 *  should show up for new page loads within a minute, not the next deploy. */
export const ANNOUNCEMENT_REVALIDATE_SECONDS = 60;

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  type: string;
  pages?: string[];
  version?: number;
}

export async function fetchAnnouncement(): Promise<AnnouncementConfig | null> {
  if (!BACKEND) return null;
  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  try {
    const res = await fetch(`${BACKEND}/api/v1/settings/announcement`, {
      headers,
      next: { revalidate: ANNOUNCEMENT_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data.data as AnnouncementConfig) : null;
  } catch {
    return null;
  }
}
