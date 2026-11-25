import GuidesList from "@/components/GuidesList";
import { fetchGuides } from "@/lib/serverContent";

// ISR: the guide list is server-rendered so titles and descriptions are in the
// HTML; refresh hourly so admin uploads show up the same day.
export const revalidate = 3600;

export default async function GuidesPage() {
  const guides = await fetchGuides();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <p className="section-label mb-2">Learn</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            Admission Guides
          </h1>
          <p className="text-sm max-w-xl" style={{ color: "var(--slate-500)" }}>
            Free PDF guides to the CAP admission process for MHT-CET engineering candidates. No sign-up.
          </p>
        </div>

        <GuidesList initialGuides={guides} />
      </div>
    </div>
  );
}
