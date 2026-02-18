"use client";

import { useState } from "react";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CollegeOption {
  id: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  home_university: string;
  cutoff_percentile: number;
  year: number;
}

interface PredictionResults {
  safe: CollegeOption[];
  target: CollegeOption[];
  dream: CollegeOption[];
}

interface PredictRequestBody {
  percentile: number;
  year: number;
  category?: string;
  gender?: string;
  home_university?: string;
  preferred_branches?: string[];
}

export default function PredictorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PredictionResults | null>(null);

  // Form state
  const [percentile, setPercentile] = useState("");
  const [year, setYear] = useState("2025");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [homeUniversity, setHomeUniversity] = useState("");
  const [branchInput, setBranchInput] = useState("");

  // Validation handlers
  const handlePercentileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseFloat(value);

    // Allow empty string or valid percentile (0-100)
    if (
      value === "" ||
      (!isNaN(numValue) && numValue >= 0 && numValue <= 100)
    ) {
      setPercentile(value);
    }
  };

  const handleBranchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow letters, spaces, commas, hyphens, and ampersands
    const cleaned = e.target.value.replace(/[^a-zA-Z\\s,&-]/g, "");
    setBranchInput(cleaned);
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const preferred_branches = branchInput
        ? branchInput
            .split(",")
            .map((b) => b.trim())
            .filter((b) => b)
        : [];

      const requestBody: PredictRequestBody = {
        percentile: Number(percentile),
        year: Number(year),
      };

      if (category) requestBody.category = category;
      if (gender) requestBody.gender = gender;
      if (homeUniversity) requestBody.home_university = homeUniversity;
      if (preferred_branches.length > 0)
        requestBody.preferred_branches = preferred_branches;

      const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.message || "Failed to get predictions");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPercentile("");
    setYear("2025");
    setCategory("");
    setGender("");
    setHomeUniversity("");
    setBranchInput("");
    setResults(null);
    setError("");
  };

  const renderCollegeList = (
    colleges: CollegeOption[],
    title: string,
    color: string
  ) => {
    if (colleges.length === 0) {
      return (
        <div className="mb-8">
          <h3 className={`text-2xl font-semibold mb-4 ${color}`}>{title}</h3>
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl text-center text-gray-500 border border-gray-200">
            No {title.toLowerCase()} found
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <h3 className={`text-2xl font-semibold mb-4 ${color}`}>
          {title} ({colleges.length})
        </h3>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-purple-50 to-pink-50">
                <tr>
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
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Cutoff
                  </th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((college) => (
                  <tr
                    key={college.id}
                    className="border-t border-gray-200 hover:bg-purple-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {college.college_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {college.branch}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {college.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {college.home_university}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-purple-600">
                      {Number(college.cutoff_percentile).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            College Predictor
          </h1>
          <p className="text-gray-600 text-lg">
            Get personalized college predictions based on your percentile
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Enter Your Details
          </h2>

          <form onSubmit={handlePredict}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label
                  htmlFor="percentile"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Percentile <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="percentile"
                  value={percentile}
                  onChange={handlePercentileChange}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  placeholder="e.g., 95.50"
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="year"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Category (Optional)
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
                  htmlFor="gender"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Gender (Optional)
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Any</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="homeUniversity"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Home University (Optional)
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
                  htmlFor="branches"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Preferred Branches (Optional)
                </label>
                <input
                  type="text"
                  id="branches"
                  value={branchInput}
                  onChange={handleBranchInputChange}
                  placeholder="e.g., Computer, Electronics"
                  maxLength={200}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated values (letters only)
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {loading ? "Predicting..." : "Predict Colleges"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
            <div className="text-xl text-gray-700 font-medium">
              Analyzing your options...
            </div>
          </div>
        )}

        {!loading && results && (
          <div>
            {renderCollegeList(results.safe, "Safe Colleges", "text-green-600")}
            {renderCollegeList(
              results.target,
              "Target Colleges",
              "text-yellow-600"
            )}
            {renderCollegeList(
              results.dream,
              "Dream Colleges",
              "text-blue-600"
            )}

            {results.safe.length === 0 &&
              results.target.length === 0 &&
              results.dream.length === 0 && (
                <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
                  <div className="text-xl text-gray-600">
                    No colleges found matching your criteria. Try adjusting your
                    filters.
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
