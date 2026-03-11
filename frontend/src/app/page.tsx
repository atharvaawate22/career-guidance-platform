"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const features: FeatureCard[] = [
  {
    title: "College Predictor",
    description:
      "Get accurate college predictions based on your MHT-CET rank, category, and preferences",
    icon: "🎯",
    href: "/predictor",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "College Cutoffs",
    description:
      "Access comprehensive cutoff data and trends for various colleges and branches",
    icon: "📊",
    href: "/cutoffs",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Admission Guides",
    description:
      "Explore detailed guides covering career paths, courses, and admission strategies",
    icon: "📚",
    href: "/guides",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Resources",
    description:
      "Download seat matrices, government circulars, previous year cutoffs, and more",
    icon: "📄",
    href: "/resources",
    color: "from-teal-500 to-green-500",
  },
  {
    title: "Book a Session",
    description:
      "Schedule personalized one-on-one sessions with experienced career counselors",
    icon: "📅",
    href: "/book",
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Latest Updates",
    description: "Stay informed with the latest MHT-CET news, notifications, and important dates",
    icon: "📰",
    href: "/updates",
    color: "from-rose-500 to-pink-500",
  },
];

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<
    "loading" | "connected" | "disconnected"
  >("loading");

  useEffect(() => {
    const checkBackendHealth = async () => {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!apiBaseUrl) {
        setBackendStatus("disconnected");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || apiBaseUrl}/api/health`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === "ok" || data.success) {
            setBackendStatus("connected");
          } else {
            setBackendStatus("disconnected");
          }
        } else {
          setBackendStatus("disconnected");
        }
      } catch {
        setBackendStatus("disconnected");
      }
    };

    checkBackendHealth();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-linear-to-br from-purple-600/10 via-pink-600/10 to-blue-600/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-purple-100">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  backendStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : backendStatus === "loading"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              ></span>
              <span className="text-sm font-semibold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {backendStatus === "connected"
                  ? "🚀 All Systems Live"
                  : backendStatus === "loading"
                    ? "⏳ Connecting..."
                    : "⚠️ System Offline"}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              MHT-CET Career Hub
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed font-medium">
              Your{" "}
              <span className="text-purple-600 font-bold">
                all-in-one platform
              </span>{" "}
              for engineering admissions in Maharashtra. Smart predictions,
              expert guidance, personalized support. ✨
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/predictor"
                className="group px-8 py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all shadow-lg"
              >
                <span className="flex items-center gap-2">
                  Predict College
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </Link>
              <Link
                href="/cutoffs"
                className="px-8 py-4 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-semibold hover:bg-purple-50 hover:border-purple-300 transition-all shadow-lg"
              >
                View Cutoffs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section - Premium Timeline Version */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Abstract background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-purple-50/50 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold tracking-[0.2em] text-purple-600 uppercase mb-4">
              The Process
            </h2>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900">
              How it works
            </h3>
          </div>

          <div className="relative">
            {/* The Main Vertical Line */}
            <div className="absolute left-6.75 md:left-1/2 top-0 bottom-0 w-1 bg-linear-to-b from-purple-500 via-pink-500 to-indigo-500 rounded-full opacity-20 hidden md:block" />
            
            {/* Steps */}
            <div className="space-y-16">
              
              {/* Step 1 */}
              <div className="relative flex flex-col md:flex-row items-center justify-between group">
                <div className="md:w-[45%] mb-8 md:mb-0 text-left md:text-right order-2 md:order-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Enter your details</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Simply provide your MHT-CET percentile and category. Our system handles all 13 reservation categories for pinpoint accuracy.
                  </p>
                </div>
                
                {/* Center Circle */}
                <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-14 h-14 bg-white border-4 border-purple-500 rounded-2xl flex items-center justify-center text-xl shadow-xl z-10 group-hover:scale-110 transition-transform order-1 md:order-2">
                  🎯
                  <span className="absolute -top-8 text-xs font-black text-purple-400 opacity-50">STEP 01</span>
                </div>

                <div className="md:w-[45%] order-3 hidden md:block" />
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col md:flex-row items-center justify-between group">
                <div className="md:w-[45%] order-1 hidden md:block" />
                
                {/* Center Circle */}
                <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-14 h-14 bg-white border-4 border-pink-500 rounded-2xl flex items-center justify-center text-xl shadow-xl z-10 group-hover:scale-110 transition-transform order-1 md:order-2">
                  📊
                  <span className="absolute -top-8 text-xs font-black text-pink-400 opacity-50">STEP 02</span>
                </div>

                <div className="md:w-[45%] mb-8 md:mb-0 text-left order-2 md:order-3">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-pink-600 transition-colors">Explore predictions</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Instantly see your Safe, Target, and Dream options. Powered by <span className="font-bold text-purple-600">14,793 actual records</span> from the 2022 CAP Round.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col md:flex-row items-center justify-between group">
                <div className="md:w-[45%] mb-8 md:mb-0 text-left md:text-right order-2 md:order-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">Finalise Your List</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Still have doubts? <span className="underline decoration-indigo-200 underline-offset-4">Book a session</span> with our experts to finalize your college preferences.
                  </p>
                </div>
                
                {/* Center Circle */}
                <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-14 h-14 bg-white border-4 border-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-xl z-10 group-hover:scale-110 transition-transform order-1 md:order-2">
                  📅
                  <span className="absolute -top-8 text-xs font-black text-indigo-400 opacity-50">STEP 03</span>
                </div>

                <div className="md:w-[45%] order-3 hidden md:block" />
              </div>

            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
              Everything you need for a successful engineering admission journey
              🎯
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-8 hover:shadow-2xl transition-all hover:scale-105"
              >
                {/* Gradient background on hover */}
                <div
                  className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`}
                ></div>

                <div className="relative">
                  <div
                    className={`inline-flex w-16 h-16 bg-linear-to-br ${feature.color} rounded-2xl items-center justify-center text-3xl mb-5 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                    Explore
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-purple-600 via-pink-600 to-blue-600"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bTAtOHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to Get Started? 🚀
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of students who have successfully navigated their
            admission journey with our expert guidance
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/predictor"
              className="px-10 py-4 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 hover:scale-105 transition-all shadow-2xl"
            >
              Start Predictor
            </Link>
            <Link
              href="/guides"
              className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold hover:bg-white/20 hover:scale-105 transition-all border-2 border-white/30"
            >
              View Guides
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-purple-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-700 font-semibold text-lg">
            © 2026{" "}
            <span className="bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              MHT-CET Career Hub
            </span>
          </p>
          <p className="text-gray-600 mt-2">
            Empowering students to achieve their academic goals ✨
          </p>
        </div>
      </footer>
    </div>
  );
}
