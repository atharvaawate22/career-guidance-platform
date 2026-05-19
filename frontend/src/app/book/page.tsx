"use client";

import { useRef, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

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

// MHT-CET is a Maharashtra-only exam — India phone numbers only.
const INDIA_COUNTRY_CODE = "+91";

const MEETING_PURPOSE_OPTIONS = [
  {
    value: "Help me build my college preference list",
    label: "Help me build my college preference list",
  },
  {
    value: "Compare branches & choose the right one",
    label: "Compare branches & choose the right one",
  },
  {
    value: "CAP round strategy & option form guidance",
    label: "CAP round strategy & option form guidance",
  },
  {
    value: "Admission process, eligibility & documents",
    label: "Admission process, eligibility & documents",
  },
  {
    value: "Percentile/rank-based college planning",
    label: "Percentile/rank-based college planning",
  },
  {
    value: "Understanding cutoff trends & seat matrix",
    label: "Understanding cutoff trends & seat matrix",
  },
  { value: "Other", label: "Other" },
];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m.toString().padStart(2, "0")} ${period}`;
}

function getNowIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

/** Returns true if the given YYYY-MM-DD string is a Saturday or Sunday (IST). */
function isWeekend(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/** Next non-weekend date string on/after `date`. */
function nextWeekday(dateStr: string): string {
  let d = new Date(`${dateStr}T00:00:00+05:30`);
  while ([0, 6].includes(d.getDay())) {
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  return d.toISOString().slice(0, 10);
}

function getMinDate() {
  const nowIST = getNowIST();
  const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  const todayIST = nowIST.toISOString().slice(0, 10);
  // If even the last slot (17:30) minus 1h buffer has already passed, start tomorrow
  const baseDate =
    nowMinutes + 60 > 17 * 60 + 30
      ? new Date(nowIST.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : todayIST;
  // Skip past weekends
  return nextWeekday(baseDate);
}

function getAvailableSlots(dateStr: string) {
  const nowIST = getNowIST();
  const todayIST = nowIST.toISOString().slice(0, 10);
  if (dateStr !== todayIST) return TIME_SLOTS;
  // getNowIST() returns new Date(Date.now() + 5.5h), so UTC fields ARE IST hours/minutes.
  const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  return TIME_SLOTS.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m >= nowMinutes + 60; // 1-hour booking buffer
  });
}

export default function BookPage() {
  const errorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    meetLink: string | null;
    isWarning: boolean;
    studentName: string;
    bookedDateTime: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slotError, setSlotError] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [meetingPurposeOption, setMeetingPurposeOption] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    student_name: "",
    email: "",
    phone: "",
    percentile: "",
    category: "",
    branch_preference: "",
    meeting_purpose: "",
    meeting_time: "",
  });

  const clearError = (field: string) =>
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  const fetchSlotsForDate = (date: string) => {
    if (!date) { setBookedSlots([]); return; }
    setSlotsLoading(true);
    fetch(`${API_BASE_URL}/api/bookings/slots?date=${date}`)
      .then((r) => r.json())
      .then((data) => setBookedSlots(data.booked ?? []))
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors: Record<string, string> = {};

    if (!formData.category) newFieldErrors.category = "Please select your reservation category.";
    if (!meetingPurposeOption) newFieldErrors.meeting_purpose = "Please select the purpose of your session.";
    if (meetingPurposeOption === "Other" && !formData.meeting_purpose.trim())
      newFieldErrors.meeting_purpose_text = "Please describe what you need help with.";
    if (!selectedDate) newFieldErrors.meeting_date = "Please select a date for your session.";
    if (selectedDate && isWeekend(selectedDate))
      newFieldErrors.meeting_date = "Sessions are only available Monday to Friday.";
    if (!formData.meeting_time) newFieldErrors.meeting_time = "Please select a time slot.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setGeneralError("");
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setGeneralError("");
    setSlotError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: `${INDIA_COUNTRY_CODE}${formData.phone}`,
          percentile: Number(formData.percentile),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        const bookedISO = data.data?.meeting_time ?? formData.meeting_time;
        const bookedDate = new Date(bookedISO).toLocaleDateString("en-IN", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
          timeZone: "Asia/Kolkata",
        });
        const bookedTime = new Date(bookedISO).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
        });
        setSuccessData({
          meetLink: data.data?.meet_link ?? null,
          isWarning: Boolean(data.warning),
          studentName: data.data?.student_name ?? formData.student_name,
          bookedDateTime: `${bookedDate} at ${bookedTime} IST`,
        });
        setSuccess(true);
        setFormData({ student_name: "", email: "", phone: "", percentile: "", category: "", branch_preference: "", meeting_purpose: "", meeting_time: "" });
        setMeetingPurposeOption(""); setSelectedDate(""); setSelectedTime("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (data.error?.code === "SLOT_TAKEN") {
          setSlotError(data.error.message);
          setSelectedTime("");
          setFormData((prev) => ({ ...prev, meeting_time: "" }));
          fetchSlotsForDate(selectedDate);
        } else {
          setGeneralError(data.error?.message || "Failed to create booking. Please try again.");
          setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setGeneralError(
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out. The server may be starting up — please try again in a moment."
          : "Error connecting to server. Please try again."
      );
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
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

    if (name === "student_name") {
      // Names: letters, spaces, hyphens, apostrophes
      const cleaned = value.replace(/[^a-zA-Z\s'-]/g, "");
      setFormData({ ...formData, [name]: cleaned });
      return;
    }

    if (name === "branch_preference") {
      // Branch names include &, /, (, ), digits e.g. "Electronics & Telecom"
      const cleaned = value.replace(/[^a-zA-Z0-9\s'&/()\.\-]/g, "");
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
    clearError("meeting_date");
    clearError("meeting_time");
    setSlotError("");
    const available = getAvailableSlots(date);
    const timeStillValid = selectedTime && available.includes(selectedTime);
    if (timeStillValid) {
      setFormData({ ...formData, meeting_time: `${date}T${selectedTime}:00+05:30` });
    } else {
      if (selectedTime) setSelectedTime("");
      setFormData({ ...formData, meeting_time: "" });
    }
    fetchSlotsForDate(date);
  };

  if (success && successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center">
            <div className="mb-6">
              <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center shadow-lg ${
                successData.isWarning
                  ? "bg-amber-400"
                  : "bg-gradient-to-br from-green-400 to-emerald-500"
              }`}>
                <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {successData.isWarning ? "Session Booked!" : "Booking Confirmed!"}
            </h2>
            {/* Booking summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-left">
              <p className="text-sm text-gray-500 mb-1">Booking Summary</p>
              <p className="font-semibold text-gray-800">{successData.studentName}</p>
              <p className="text-gray-600 text-sm mt-0.5">📅 {successData.bookedDateTime}</p>
            </div>
            {successData.isWarning ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-amber-800 font-medium text-sm">⚠️ Meet link pending</p>
                <p className="text-amber-700 text-sm mt-1">
                  Your session is saved. A Google Meet link will be sent to your email within a few hours.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 mb-6">
                <p className="text-sm text-gray-600 font-medium mb-2">Google Meet Link:</p>
                <a
                  href={successData.meetLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 font-semibold hover:underline break-all"
                >
                  {successData.meetLink}
                </a>
              </div>
            )}
            <p className="text-gray-500 text-sm mb-6">
              A confirmation email will be sent to your inbox shortly. Check spam if you don&apos;t see it.
            </p>
            <div className="flex gap-4 justify-center">
              {!successData.isWarning && (
                <button
                  onClick={() => window.open(successData.meetLink!, "_blank")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Open Meet Link
                </button>
              )}
              <button
                onClick={() => { setSuccess(false); setSuccessData(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Book Another Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Book a Session
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Schedule a one-on-one career guidance session with our expert
            counselors. Get personalized advice on college selection and
            admission strategies.
          </p>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 mb-6 flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">🎥</span>
          <div>
            <span className="font-semibold">Free session via Google Meet.</span>{" "}
            You&apos;ll receive a confirmation email with the Meet link after
            booking. Sessions are 30 minutes long.
          </div>
        </div>

        {generalError && (
          <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {generalError}
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
                  autoComplete="name"
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
                  autoComplete="email"
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
                  <span className="inline-flex items-center px-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="[0-9]{10}"
                    minLength={10}
                    maxLength={10}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="9876543210"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter 10-digit mobile number</p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Percentile <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentile"
                  required
                  step="0.0001"
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
                  onChange={(v) => { setFormData({ ...formData, category: v }); clearError("category"); }}
                  placeholder="Select category"
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
                    { value: "PWD_OPEN", label: "PWD OPEN (Persons with Disability)" },
                  ]}
                />
                {fieldErrors.category && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.category}</p>
                )}
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
                  Purpose of Meeting <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={meetingPurposeOption}
                  onChange={(value) => {
                    setMeetingPurposeOption(value);
                    clearError("meeting_purpose");
                    setFormData((current) => ({
                      ...current,
                      meeting_purpose: value === "Other" ? "" : value,
                    }));
                  }}
                  placeholder="Select purpose"
                  options={MEETING_PURPOSE_OPTIONS}
                />
                {fieldErrors.meeting_purpose && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.meeting_purpose}</p>
                )}
              </div>

              {meetingPurposeOption === "Other" && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Tell us your purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="meeting_purpose"
                    required
                    minLength={3}
                    maxLength={150}
                    value={formData.meeting_purpose}
                    onChange={(e) => { handleInputChange(e); clearError("meeting_purpose_text"); }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe what you want help with"
                  />
                  {fieldErrors.meeting_purpose_text && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.meeting_purpose_text}</p>
                  )}
                </div>
              )}

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
                  min={getMinDate()}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Mon – Fri only. Weekends unavailable.</p>
                {fieldErrors.meeting_date && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.meeting_date}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">
                  Meeting Time <span className="text-red-500">*</span>
                </label>
                {!selectedDate ? (
                  <p className="text-sm text-gray-400 italic">
                    Please select a date first.
                  </p>
                ) : slotsLoading ? (
                  <p className="text-sm text-gray-400 italic">Loading slots…</p>
                ) : (
                  <>
                    <div className="flex gap-3 flex-wrap text-xs mb-2">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span>{" "}
                        Available
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-red-400"></span>{" "}
                        Booked
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-gray-300"></span>{" "}
                        Unavailable
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isBooked = bookedSlots.includes(slot);
                        const isUnavailable =
                          !getAvailableSlots(selectedDate).includes(slot);
                        const isSelected = selectedTime === slot;
                        let cls = "";
                        if (isUnavailable) {
                          cls =
                            "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                        } else if (isBooked) {
                          cls =
                            "bg-red-100 text-red-400 border-red-200 cursor-not-allowed line-through";
                        } else if (isSelected) {
                          cls =
                            "bg-purple-600 text-white border-purple-600 shadow-md scale-105";
                        } else {
                          cls =
                            "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 cursor-pointer";
                        }
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isBooked || isUnavailable}
                            onClick={() => {
                              if (isBooked || isUnavailable) return;
                              setSelectedTime(slot);
                              setFormData({
                                ...formData,
                                meeting_time: `${selectedDate}T${slot}:00+05:30`,
                              });
                            }}
                            className={`border rounded-lg py-2 px-1 text-xs font-medium text-center transition-all ${cls}`}
                          >
                            {formatTimeLabel(slot)}
                          </button>
                        );
                      })}
                    </div>
                    {!selectedTime && (
                      <p className="text-xs text-gray-500 mt-2">Select a green slot to book.</p>
                    )}
                    {slotError && (
                      <p className="text-xs text-red-600 mt-2 font-medium">{slotError}</p>
                    )}
                    {fieldErrors.meeting_time && (
                      <p className="text-xs text-red-600 mt-2">{fieldErrors.meeting_time}</p>
                    )}
                  </>
                )}
                {/* Hidden input to keep form required validation working */}
                <input
                  type="hidden"
                  name="meeting_time"
                  required
                  value={formData.meeting_time}
                />
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? "Scheduling…" : "Book Session"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
