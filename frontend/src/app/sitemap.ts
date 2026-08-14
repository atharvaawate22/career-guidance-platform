import type { MetadataRoute } from 'next';
import { collegeSlug } from '@/lib/collegeSlug';
import { fetchCutoffMeta } from '@/lib/serverCutoffs';
import { BOOKINGS_ENABLED } from '@/lib/features';

import { CUTOFF_YEAR } from '@/lib/dataYear';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cethub.in';

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/predictor`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cutoffs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...(BOOKINGS_ENABLED ? [{
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }] : []),
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    // Both pages exist and are linked from the footer, but were absent from the
    // sitemap. Low priority — they are trust/compliance pages, not entry points,
    // but a search engine that cannot find a privacy policy is a real signal.
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/mht-cet-cap-2026-schedule`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Per-college cutoff pages. If the backend is unreachable at build/revalidate
  // time, ship the static entries alone rather than failing the sitemap.
  const meta = await fetchCutoffMeta(CUTOFF_YEAR);
  const collegeEntries: MetadataRoute.Sitemap = (meta?.colleges ?? [])
    .filter((c): c is { code: string; name: string } => !!c.code)
    .map((c) => ({
      url: `${baseUrl}/cutoffs/${collegeSlug(c.code, c.name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  return [...staticEntries, ...collegeEntries];
}
