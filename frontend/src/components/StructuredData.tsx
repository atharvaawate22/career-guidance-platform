import { SITE_URL, SITE_NAME } from "@/lib/site";

/**
 * Global structured data (JSON-LD), rendered once in the root layout so it is
 * present on every page. Powers Google rich results and answer-engine (AEO/GEO)
 * citation for the Organization, the website itself, and the free predictor web
 * app. Page-specific schema (FAQPage on the home FAQ, NewsArticle on /updates,
 * ItemList on /cutoffs) lives in those components.
 */
export default function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "MHT-CET Career Hub",
        url: SITE_URL,
        description:
          "CET Hub helps Maharashtra MHT-CET (PCM) candidates predict engineering colleges, explore CAP cutoffs, and plan their admission.",
        areaServed: "Maharashtra, India",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description:
          "MHT-CET college predictor, 2025 cutoff explorer, and admission guidance for Maharashtra engineering CAP rounds.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-IN",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/predictor#app`,
        name: "MHT-CET College Predictor",
        url: `${SITE_URL}/predictor`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        description:
          "Free MHT-CET college predictor — enter your percentile or CAP rank to see Safe, Target, and Dream engineering colleges across Maharashtra, based on 90,000+ official 2025 CAP cutoff records.",
        provider: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-IN",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
