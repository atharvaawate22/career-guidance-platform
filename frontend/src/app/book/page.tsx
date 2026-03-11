"use client";

import { useState } from "react";
import CustomSelect from "@/components/CustomSelect";

const TIME_SLOTS = [
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function BookPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [meetLink, setMeetLink] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  // Form state
  const [formData, setFormData] = useState({
    student_name: "",
    email: "",
    phone: "",
    percentile: "",
    category: "",
    branch_preference: "",
    meeting_time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            percentile: Number(formData.percentile),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMeetLink(data.data.meet_link);
        // Reset form
        setFormData({
          student_name: "",
          email: "",
          phone: "",
          percentile: "",
          category: "",
          branch_preference: "",
          meeting_time: "",
        });
        setSelectedDate("");
        setSelectedTime("");
      } else {
        setError(
          data.error?.message || data.message || "Failed to create booking"
        );
      }
    } catch {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Specific validation for different fields
    if (name === "phone") {
      // Only allow digits, limit to 10 characters
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 10) {
        setFormData({ ...formData, [name]: cleaned });
      }
      return;
    }

    if (name === "student_name" || name === "branch_preference") {
      // Only allow letters, spaces, hyphens, and apostrophes
      const cleaned = value.replace(/[^a-zA-Z\s'-]/g, "");
      setFormData({ ...formData, [name]: cleaned });
      return;
    }

    if (name === "percentile") {
      // Validate percentile range
      const numValue = parseFloat(value);
      if (
        value === "" ||
        (!isNaN(numValue) && numValue >= 0 && numValue <= 100)
      ) {
        setFormData({ ...formData, [name]: value });
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (selectedTime) {
      setFormData({
        ...formData,
        meeting_time: `${date}T${selectedTime}:00+05:30`,
      });
    } else {
      setFormData({ ...formData, meeting_time: "" });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const time = e.target.value;
    setSelectedTime(time);
    if (selectedDate) {
      setFormData({
        ...formData,
        meeting_time: `${selectedDate}T${time}:00+05:30`,
      });
    }
  };

  if (success && meetLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto h-20 w-20 bg-linear-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="h-12 w-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4 bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600 mb-6">
              Your consultation has been scheduled successfully. A confirmation
              email has been sent to your inbox.
            </p>
            <div className="bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-600 font-medium mb-2">
                Google Meet Link:
              </p>
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 font-semibold hover:underline break-all"
              >
                {meetLink}
              </a>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.open(meetLink, "_blank")}
                className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Open Meet Link
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setMeetLink("");
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Book a Session
          </h1>
          <p className="text-gray-600 text-lg">
            Schedule a one-on-one career guidance session with our expert
            counselors. Get personalized advice on college selection and
            admission strategies.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="student_name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={formData.student_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your.email@gmail.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 items-stretch">
                  <CustomSelect
                    value={countryCode}
                    onChange={setCountryCode}
                    className="w-28 shrink-0"
                    options={COUNTRY_CODES.map((c) => ({
                      value: c.code,
                      label: `${c.flag} ${c.code}`,
                    }))}
                  />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="[0-9]{10}"
                    minLength={10}
                    maxLength={10}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="9876543210"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10-digit phone number
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Percentile <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentile"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentile}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="95.50"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.category}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  placeholder="Select category"
                  required
                  options={[
                    { value: "", label: "Select category" },
                    { value: "OPEN", label: "OPEN" },
                    { value: "SC", label: "SC" },
                    { value: "ST", label: "ST" },
                    { value: "VJ", label: "VJ (Vimukta Jati)" },
                    { value: "NT1", label: "NT1 (Nomadic Tribe 1)" },
                    { value: "NT2", label: "NT2 (Nomadic Tribe 2)" },
                    { value: "NT3", label: "NT3 (Nomadic Tribe 3)" },
                    { value: "OBC", label: "OBC" },
                    { value: "EWS", label: "EWS" },
                    { value: "TFWS", label: "TFWS (Tuition Fee Waiver)" },
                    { value: "DEF_OPEN", label: "DEF OPEN (Defence)" },
                    { value: "DEF_OBC", label: "DEF OBC (Defence OBC)" },
                    {
                      value: "PWD_OPEN",
                      label: "PWD OPEN (Persons with Disability)",
                    },
                  ]}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Branch Preference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="branch_preference"
                  required
                  minLength={2}
                  maxLength={100}
                  value={formData.branch_preference}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Computer Engineering"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Meeting Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="meeting_date"
                  required
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Meeting Time <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedTime}
                  onChange={(v) => {
                    setSelectedTime(v);
                    if (selectedDate && v) {
                      setFormData({
                        ...formData,
                        meeting_time: `${selectedDate}T${v}:00+05:30`,
                      });
                    } else {
                      setFormData({ ...formData, meeting_time: "" });
                    }
                  }}
                  placeholder="Select a time slot"
                  required
                  options={[
                    { value: "", label: "Select a time slot" },
                    ...TIME_SLOTS.map((slot) => ({
                      value: slot,
                      label: formatTimeLabel(slot),
                    })),
                  ]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available slots: 10:00 AM – 5:30 PM (last slot ends at 6:00
                  PM)
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Scheduling..." : "Book Session"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
