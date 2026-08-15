"use client";

import { useRef } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import ArrowRight from "@/components/ArrowRight";

export interface Feature {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
  borderHover: string;
}

// Split out of the homepage so the page itself can be a server component —
// this is the one card in the feature grid that needs client JS (the
// pointer-driven tilt effect below).
export default function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
  };

  return (
    <ScrollReveal animation="fade-up" delay={index * 80}>
      <Link
        ref={cardRef}
        href={feature.href}
        className="group block rounded-2xl p-6 border transition-all duration-300"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--slate-200)",
          boxShadow: "var(--shadow-xs)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = feature.borderHover;
          e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--slate-200)";
          e.currentTarget.style.boxShadow = "var(--shadow-xs)";
          handleMouseLeave();
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
          style={{ background: feature.gradient, color: feature.iconColor }}
        >
          {feature.icon}
        </div>

        {/* Content */}
        <h3
          className="text-[17px] font-bold mb-2 transition-colors"
          style={{ color: "var(--slate-900)" }}
        >
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--slate-500)" }}>
          {feature.desc}
        </p>

        {/* Link indicator */}
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 group-hover:gap-2.5"
          style={{ color: feature.iconColor }}
        >
          Explore
          <ArrowRight size={14} />
        </span>
      </Link>
    </ScrollReveal>
  );
}
