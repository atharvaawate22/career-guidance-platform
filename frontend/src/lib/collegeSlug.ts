/**
 * URL slugs for the per-college cutoff pages (/cutoffs/[collegeSlug]).
 *
 * The slug embeds the DTE college code as a prefix — e.g.
 * "6006-college-of-engineering-pune" — so the reverse lookup (slug → college)
 * never depends on fuzzy name matching, and two colleges with similar names
 * can never collide.
 */

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function collegeSlug(code: string, name: string): string {
  return `${code}-${slugifyName(name)}`;
}

/** Extract the college code from a slug; null if the slug is malformed. */
export function parseCollegeSlug(slug: string): string | null {
  const m = /^([A-Za-z0-9]{1,10})-/.exec(slug);
  return m ? m[1] : null;
}
