import Link from "next/link";

const footerColumns = [
  {
    heading: "Tools",
    links: [
      { label: "College Predictor", href: "/predictor" },
      { label: "Cutoff Explorer", href: "/cutoffs" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Admission Guides", href: "/guides" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Book a Session", href: "/book" },
      { label: "Latest Updates", href: "/updates" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--slate-900)",
        borderTop: "1px solid var(--slate-800)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-10">
        {/* Top: Brand + Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                style={{
                  background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
                }}
              >
                C
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                CET<span style={{ color: "var(--primary-400)" }}>Hub</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--slate-400)" }}>
              Helping MHT-CET aspirants make data-driven admission decisions with
              real cutoff data and expert guidance.
            </p>
          </div>

          {/* Link Columns */}
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "var(--slate-500)" }}
              >
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200"
                      style={{ color: "var(--slate-400)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--primary-400)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--slate-400)")
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--slate-800)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--slate-500)" }}>
            © {new Date().getFullYear()}{" "}
            <span style={{ color: "var(--primary-400)" }}>CETHub</span>
            . All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--slate-600)" }}>
            Powered by official 2025 Maharashtra CAP data
          </p>
        </div>
      </div>
    </footer>
  );
}
