import { ImageResponse } from "next/og";
import { CUTOFF_YEAR } from "@/lib/dataYear";

// Dynamically generated Open Graph / Twitter card image (1200x630). Next.js
// auto-attaches this to OG + Twitter metadata for every route, so social shares
// and SERP previews get a branded image without shipping a static asset.
export const alt = "CET Hub — MHT-CET College Predictor, Cutoffs & Guidance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #0f172a 55%, #134e4a 130%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "22px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "linear-gradient(135deg, #6366f1, #4338ca)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 50,
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div style={{ fontSize: 46, fontWeight: 800 }}>CET Hub</div>
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 1010 }}>
          MHT-CET College Predictor &amp; Cutoff Explorer
        </div>
        {/* Single expression child, not text + {expr} + text: Satori (next/og)
            rejects a <div> with more than one child unless it declares an
            explicit display, and interpolating inline would split this into
            three nodes. */}
        <div style={{ fontSize: 30, marginTop: 30, color: "#cbd5e1", maxWidth: 940 }}>
          {`Predict colleges by percentile · 90,000+ ${CUTOFF_YEAR} CAP cutoff records · Free expert guidance for Maharashtra engineering admissions`}
        </div>
      </div>
    ),
    { ...size },
  );
}
