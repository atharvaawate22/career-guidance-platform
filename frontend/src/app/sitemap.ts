import type { MetadataRoute } from 'next';
import { collegeSlug } from '@/lib/collegeSlug';
import { fetchCutoffMeta } from '@/lib/serverCutoffs';

const CUTOFF_YEAR = '2025';

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
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
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
