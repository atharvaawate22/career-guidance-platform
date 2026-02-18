"use client";

import { useState } from "react";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CutoffData {
  id: string;
  year: number;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  home_university: string;
  percentile: number;
}

export default function CutoffsPage() {
  const [cutoffs, setCutoffs] = useState<CutoffData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const [homeUniversity, setHomeUniversity] = useState("");
  const [collegeName, setCollegeName] = useState("");

  // Validation handlers
  const handleBranchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow letters, spaces, hyphens, and ampersands
    const cleaned = e.target.value.replace(/[^a-zA-Z\\s&-]/g, "");
    setBranch(cleaned);
  };

  const handleCollegeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow letters, spaces, hyphens, dots, and parentheses
    const cleaned = e.target.value.replace(/[^a-zA-Z\\s.()-]/g, "");
    setCollegeName(cleaned);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (year) params.append("year", year);
      if (branch) params.append("branch", branch);
      if (category) params.append("category", category);
      if (homeUniversity) params.append("home_university", homeUniversity);
      if (collegeName) params.append("college_name", collegeName);

      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/cutoffs?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setCutoffs(data.data);
      } else {
        setError("Failed to fetch cutoffs");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setYear("");
    setBranch("");
    setCategory("");
    setHomeUniversity("");
    setCollegeName("");
    setCutoffs([]);
    setError("");
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Cutoff Explorer
          </h1>
          <p className="text-gray-600 text-lg">
            Search and explore historical cutoff data for engineering colleges
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                htmlFor="year"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Years</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="branch"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Branch
              </label>
              <input
                type="text"
                id="branch"
                value={branch}
                onChange={handleBranchChange}
                placeholder="e.g., Computer Engineering"
                maxLength={100}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="OPEN">OPEN</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="homeUniversity"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Home University
              </label>
              <select
                id="homeUniversity"
                value={homeUniversity}
                onChange={(e) => setHomeUniversity(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="MU">Mumbai University</option>
                <option value="PU">Pune University</option>
                <option value="OU">Other University</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="collegeName"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                College Name
              </label>
              <input
                type="text"
                id="collegeName"
                value={collegeName}
                onChange={handleCollegeNameChange}
                placeholder="e.g., VJTI"
                maxLength={200}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Results Section */}
        {loading ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
            <div className="text-xl text-gray-700 font-medium">
              Loading cutoffs...
            </div>
          </div>
        ) : cutoffs.length === 0 ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="text-xl text-gray-600">
              No cutoff data found. Try adjusting your filters or click Search
              to view all data.
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-linear-to-r from-purple-50 to-pink-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Year
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      College
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Home Univ.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Percentile
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cutoffs.map((cutoff) => (
                    <tr
                      key={cutoff.id}
                      className="border-t border-gray-200 hover:bg-purple-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {cutoff.year}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {cutoff.college_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {cutoff.branch}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {cutoff.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {cutoff.home_university}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {cutoff.gender || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-600">
                        {Number(cutoff.percentile).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-linear-to-r from-purple-50 to-pink-50 text-sm text-gray-600 font-medium">
              Showing {cutoffs.length} result{cutoffs.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
