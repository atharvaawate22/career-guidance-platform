import ResourcesList from "@/components/ResourcesList";
import { fetchResources } from "@/lib/serverContent";

// ISR: the list is server-rendered so every resource title is in the HTML;
// refresh hourly so admin edits and the weekly notices routine show up.
export const revalidate = 3600;

export default async function ResourcesPage() {
  const resources = await fetchResources();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <p className="section-label mb-2">Downloads</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            Resources
          </h1>
          <p className="text-sm max-w-xl" style={{ color: "var(--slate-500)" }}>
            Official MHT-CET documents in one place: syllabus, notices, merit lists, seat matrices and past cutoff PDFs.
          </p>
        </div>

        <ResourcesList initialResources={resources} />
      </div>
    </div>
  );
}
