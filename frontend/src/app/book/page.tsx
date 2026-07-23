"use client";

import { useRef, useState, useEffect } from "react";
import ComboBox from "@/components/ComboBox";
import CustomSelect from "@/components/CustomSelect";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { categorySelectOptions } from "@/lib/categoryOptions";
import { sortBranches } from "@/lib/cutoffOptions";
import { suggestEmailCorrection } from "@/lib/emailSuggestion";
import { buildWaMeLink } from "@/lib/whatsapp";

// Same meta endpoint/year the predictor and cutoff explorer use for their
// branch lists, so all three stay in sync automatically.
const META_YEAR = process.env.NEXT_PUBLIC_PREDICTOR_YEAR || "2025";

// Default fallback — only used if settings API is unreachable
const DEFAULT_TIME_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface SlotConfig {
  enabled: boolean;
  slots: string[];
  working_days: number[];
  special_open_dates: string[];
  special_closed_dates: string[];
}

// MHT-CET is a Maharashtra-only exam — India phone numbers only.
const INDIA_COUNTRY_CODE = "+91";

const MEETING_PURPOSE_OPTIONS = [
  { value: "Help me build my college preference list", label: "Help me build my college preference list" },
  { value: "Compare branches & choose the right one", label: "Compare branches & choose the right one" },
  { value: "CAP round strategy & option form guidance", label: "CAP round strategy & option form guidance" },
  { value: "Admission process, eligibility & documents", label: "Admission process, eligibility & documents" },
  { value: "Percentile/rank-based college planning", label: "Percentile/rank-based college planning" },
  { value: "Understanding cutoff trends & seat matrix", label: "Understanding cutoff trends & seat matrix" },
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

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateString(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function formatDateString(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDays(dateStr: string, days: number) {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateString(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

function getDayOfWeek(dateStr: string) {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function getMonthKey(dateStr: string) {
  const { year, month } = parseDateString(dateStr);
  return `${year}-${pad2(month)}`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Returns true if the given YYYY-MM-DD string is NOT a working day (based on config). */
function isNonWorkingDay(dateStr: string, config: SlotConfig): boolean {
  // Force-closed dates always block
  if (config.special_closed_dates.includes(dateStr)) return true;
  const day = getDayOfWeek(dateStr); // 0=Sun, 6=Sat
  // If it's a special open date, it's always working
  if (config.special_open_dates.includes(dateStr)) return false;
  return !config.working_days.includes(day);
}

/** Next working date string on/after `date`. */
function nextWorkingDay(dateStr: string, config: SlotConfig): string {
  let candidate = dateStr;
  let attempts = 0;
  while (isNonWorkingDay(candidate, config) && attempts < 30) {
    candidate = addDays(candidate, 1);
    attempts++;
  }
  return candidate;
}

const MIN_BOOKING_LEAD_MINUTES = 180; // 3-hour minimum lead time before a slot can be booked

function getMinDate(config: SlotConfig) {
  const nowIST = getNowIST();
  const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  const todayIST = nowIST.toISOString().slice(0, 10);
  // Find latest slot time to determine if today is still valid
  const sortedSlots = [...config.slots].sort();
  const lastSlot = sortedSlots[sortedSlots.length - 1] || "17:30";
  const [lastH, lastM] = lastSlot.split(":").map(Number);
  const baseDate =
    nowMinutes + MIN_BOOKING_LEAD_MINUTES > lastH * 60 + lastM
      ? addDays(todayIST, 1)
      : todayIST;
  return nextWorkingDay(baseDate, config);
}

function getAvailableSlots(dateStr: string, config: SlotConfig) {
  const nowIST = getNowIST();
  const todayIST = nowIST.toISOString().slice(0, 10);
  if (dateStr !== todayIST) return config.slots;
  const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  return config.slots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m >= nowMinutes + MIN_BOOKING_LEAD_MINUTES;
  });
}

function getMonthDates(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatDateString(year, month, day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function BookPage() {
  const errorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "review">("form");
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    meetLink: string | null;
    isWarning: boolean;
    studentName: string;
    bookedDateTime: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getMonthKey(getMinDate({
      enabled: true,
      slots: DEFAULT_TIME_SLOTS,
      working_days: DEFAULT_WORKING_DAYS,
      special_open_dates: [],
      special_closed_dates: [],
    }))
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [slotError, setSlotError] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [meetingPurposeOption, setMeetingPurposeOption] = useState("");
  const [waLink, setWaLink] = useState<string | null>(null);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/v1/cutoffs/meta?year=${META_YEAR}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBranchOptions(sortBranches(d.data.branches ?? []));
      })
      .catch(() => { /* ComboBox still works as free text if this fails */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/settings/contact-info`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.phone) {
          setWaLink(buildWaMeLink(d.data.phone, "Hi! I'd like to book a free counseling session."));
        }
      })
      .catch(() => {});
  }, []);

  const [slotConfig, setSlotConfig] = useState<SlotConfig>({
    enabled: true,
    slots: DEFAULT_TIME_SLOTS,
    working_days: DEFAULT_WORKING_DAYS,
    special_open_dates: [],
    special_closed_dates: [],
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/settings/booking-slots`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setSlotConfig(d.data);
          setCalendarMonth(getMonthKey(getMinDate(d.data)));
        }
      })
      .catch(() => { /* fallback to defaults */ });
  }, []);

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
    fetch(`${API_BASE_URL}/api/v1/bookings/slots?date=${date}`)
      .then((r) => r.json())
      .then((data) => setBookedSlots(data.booked ?? []))
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors: Record<string, string> = {};

    if (!slotConfig.enabled) newFieldErrors.meeting_date = "Booking sessions are currently closed.";
    const suggestedEmail = suggestEmailCorrection(formData.email);
    if (suggestedEmail)
      newFieldErrors.email = `Please enter a valid email address. Did you mean ${suggestedEmail}?`;
    if (!formData.category) newFieldErrors.category = "Please select your reservation category.";
    if (formData.branch_preference.trim().length < 2)
      newFieldErrors.branch_preference = "Please enter your branch preference.";
    if (!meetingPurposeOption) newFieldErrors.meeting_purpose = "Please select the purpose of your session.";
    if (meetingPurposeOption === "Other" && !formData.meeting_purpose.trim())
      newFieldErrors.meeting_purpose_text = "Please describe what you need help with.";
    if (!selectedDate) newFieldErrors.meeting_date = "Please select a date for your session.";
    if (selectedDate && isNonWorkingDay(selectedDate, slotConfig))
      newFieldErrors.meeting_date = "Sessions are not available on the selected date.";
    if (!formData.meeting_time) newFieldErrors.meeting_time = "Please select a time slot.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      // Banner at the top summarizes the problem; the highlighted fields carry
      // the details. Without it, a user at the submit button never sees field
      // errors rendered further up the form.
      setGeneralError(
        newFieldErrors.email
          ? "The email address appears to be invalid. Please correct it and try again."
          : "Please correct the highlighted fields and try again."
      );
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    setFieldErrors({});
    setGeneralError("");
    setSlotError("");
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    setGeneralError("");
    setSlotError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
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
        setStep("form");
        setFormData({ student_name: "", email: "", phone: "", percentile: "", category: "", branch_preference: "", meeting_purpose: "", meeting_time: "" });
        setMeetingPurposeOption(""); setSelectedDate(""); setSelectedTime("");
        setCalendarMonth(getMonthKey(getMinDate(slotConfig)));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Every failure path sends the user back to the editable form — the
        // review screen has no fields of its own to surface these errors on.
        setStep("form");
        if (data.error?.code === "SLOT_TAKEN") {
          setSlotError(data.error.message);
          setSelectedTime("");
          setFormData((prev) => ({ ...prev, meeting_time: "" }));
          fetchSlotsForDate(selectedDate);
        } else if (
          data.error?.code === "INVALID_EMAIL_DOMAIN" ||
          (data.error?.code === "VALIDATION_ERROR" &&
            data.error.details?.some((d: { path: string }) => d.path === "email"))
        ) {
          const emailIssue = data.error.details?.find(
            (d: { path: string; message: string }) => d.path === "email"
          );
          setFieldErrors({ email: emailIssue?.message ?? data.error.message });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setGeneralError(data.error?.message || "Failed to create booking. Please try again.");
          setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setStep("form");
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

  const handleDateSelect = (date: string) => {
    if (date < getMinDate(slotConfig) || isNonWorkingDay(date, slotConfig)) {
      return;
    }

    setSelectedDate(date);
    setCalendarMonth(getMonthKey(date));
    clearError("meeting_date");
    clearError("meeting_time");
    setSlotError("");
    const available = getAvailableSlots(date, slotConfig);
    const timeStillValid = selectedTime && available.includes(selectedTime);
    if (timeStillValid) {
      setFormData({ ...formData, meeting_time: `${date}T${selectedTime}:00+05:30` });
    } else {
      if (selectedTime) setSelectedTime("");
      setFormData({ ...formData, meeting_time: "" });
    }
    fetchSlotsForDate(date);
  };

  const emailSuggestion = suggestEmailCorrection(formData.email);
  const minDate = getMinDate(slotConfig);
  const calendarDates = getMonthDates(calendarMonth);
  const minMonth = getMonthKey(minDate);
  const canGoToPreviousMonth = calendarMonth > minMonth;

  if (success && successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full rounded-2xl p-8 border" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xl)" }}>
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
            <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--primary-600)" }}>
              {successData.isWarning ? "Session Booked!" : "Booking Confirmed!"}
            </h2>
            {/* Booking summary */}
            <div className="rounded-xl border p-4 mb-5 text-left" style={{ background: "var(--slate-50)", borderColor: "var(--slate-200)" }}>
              <p className="text-sm mb-1" style={{ color: "var(--slate-500)" }}>Booking Summary</p>
              <p className="font-semibold" style={{ color: "var(--slate-900)" }}>{successData.studentName}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--slate-600)" }}>📅 {successData.bookedDateTime}</p>
            </div>
            {successData.isWarning ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-amber-800 font-medium text-sm">⚠️ Meet link pending</p>
                <p className="text-amber-700 text-sm mt-1">
                  Your session is saved. A Google Meet link will be sent to your email within a few hours.
                </p>
              </div>
            ) : (
              <div className="rounded-xl p-5 mb-6" style={{ background: "var(--primary-50)", border: "1px solid var(--primary-200)" }}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--slate-600)" }}>Google Meet Link:</p>
                <a
                  href={successData.meetLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline break-all" style={{ color: "var(--primary-600)" }}
                >
                  {successData.meetLink}
                </a>
              </div>
            )}
            <p className="text-sm mb-6" style={{ color: "var(--slate-500)" }}>
              A confirmation email will be sent to your inbox shortly. Check spam if you don&apos;t see it.
            </p>
            <div className="flex gap-4 justify-center">
              {!successData.isWarning && (
                <button
                  onClick={() => window.open(successData.meetLink!, "_blank")}
                  className="text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }}
                >
                  Open Meet Link
                </button>
              )}
              <button
                onClick={() => { setSuccess(false); setSuccessData(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="py-3 px-6 rounded-xl font-semibold transition-colors"
                style={{ background: "var(--slate-100)", color: "var(--slate-700)" }}
              >
                Book Another Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review") {
    const reviewDate = formData.meeting_time
      ? new Date(formData.meeting_time).toLocaleDateString("en-IN", {
          weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
        })
      : "";
    const reviewTime = formData.meeting_time
      ? new Date(formData.meeting_time).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
        })
      : "";
    const reviewPurpose = meetingPurposeOption === "Other" ? formData.meeting_purpose : meetingPurposeOption;
    const reviewRows: Array<[string, string]> = [
      ["Full Name", formData.student_name],
      ["Email", formData.email],
      ["Phone", `${INDIA_COUNTRY_CODE} ${formData.phone}`],
      ["Percentile", formData.percentile],
      ["Category", formData.category],
      ["Branch Preference", formData.branch_preference],
      ["Purpose of Meeting", reviewPurpose],
      ["Date", reviewDate],
      ["Time", `${reviewTime} IST`],
      ["Duration", "20 minutes"],
    ];

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }} className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="section-label mb-2">Guidance</p>
            <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              Review Your Booking
            </h1>
            <p className="text-sm" style={{ color: "var(--slate-500)" }}>
              Please check your details below before confirming your 20-minute session.
            </p>
          </div>

          {generalError && (
            <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {generalError}
            </div>
          )}

          <div className="rounded-2xl border p-6 sm:p-8" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-sm)" }}>
            <dl className="divide-y" style={{ borderColor: "var(--slate-100)" }}>
              {reviewRows.map(([label, value]) => (
                <div key={label} className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium" style={{ color: "var(--slate-500)" }}>{label}</dt>
                  <dd className="text-sm font-semibold col-span-2" style={{ color: "var(--slate-900)" }}>{value || "—"}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => { setStep("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={loading}
                className="flex-1 py-3 px-6 rounded-xl font-semibold transition-colors disabled:opacity-50"
                style={{ background: "var(--slate-100)", color: "var(--slate-700)" }}
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={loading}
                className="flex-1 text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? "Scheduling…" : "Confirm & Book Session"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }} className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="section-label mb-2">Guidance</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            Book a Session
          </h1>
          <p className="text-sm" style={{ color: "var(--slate-500)" }}>
            Schedule a free 20-minute one-on-one career guidance session with
            our expert counselors. Get personalized advice on college
            selection and admission strategies.
          </p>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border px-4 py-3 text-sm mb-6 flex items-start gap-3" style={{ background: "var(--success-50)", borderColor: "var(--success-200)", color: "var(--success-700)" }}>
          <span className="text-lg leading-none mt-0.5">🎥</span>
          <div>
            <span className="font-semibold">Free 20-minute session via Google Meet.</span>{" "}
            You&apos;ll receive a confirmation email with the Meet link after
            booking.
          </div>
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border px-4 py-3 text-sm mb-6 flex items-center gap-3 transition-colors hover:brightness-95"
            style={{ background: "#25D36612", borderColor: "#25D36640", color: "#128C7E" }}
          >
            <span className="text-lg leading-none">💬</span>
            <div>
              <span className="font-semibold">Prefer WhatsApp?</span>{" "}
              Message us directly instead of filling out the form below.
            </div>
          </a>
        )}

        {generalError && (
          <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {generalError}
          </div>
        )}

        <div className="rounded-2xl border p-8" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-sm)" }}>
          <form onSubmit={handleReviewSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Full Name <span style={{ color: "var(--danger-500)" }}>*</span>
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
                  className="input-base"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Email <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => { handleInputChange(e); clearError("email"); }}
                  className="input-base"
                  placeholder="your.email@gmail.com"
                />
                {emailSuggestion && (
                  <p className="text-xs mt-1" style={{ color: "var(--slate-600)" }}>
                    Did you mean{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      style={{ color: "var(--primary-600)" }}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, email: emailSuggestion }));
                        clearError("email");
                      }}
                    >
                      {emailSuggestion}
                    </button>
                    ?
                  </p>
                )}
                {fieldErrors.email && (
                  <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Phone <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <div className="flex gap-2 items-stretch">
                  <span className="inline-flex items-center px-3 rounded-lg text-sm font-medium select-none" style={{ border: "1px solid var(--slate-200)", background: "var(--slate-50)", color: "var(--slate-600)" }}>
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
                    className="flex-1 min-w-0 input-base"
                    placeholder="9876543210"
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--slate-600)" }}>Enter 10-digit mobile number</p>
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Percentile <span style={{ color: "var(--danger-500)" }}>*</span>
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
                  className="input-base"
                  placeholder="95.50"
                />
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Category <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <CustomSelect
                  value={formData.category}
                  onChange={(v) => { setFormData({ ...formData, category: v }); clearError("category"); }}
                  placeholder="Select category"
                  options={categorySelectOptions([], [{ value: "", label: "Select category" }])}
                />
                {fieldErrors.category && (
                  <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Branch Preference <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <ComboBox
                  id="branch_preference"
                  value={formData.branch_preference}
                  onChange={(v) => {
                    // Branch names include &, /, (, ), digits e.g. "Electronics & Telecom"
                    const cleaned = v.replace(/[^a-zA-Z0-9\s'&/()\.\-]/g, "");
                    setFormData({ ...formData, branch_preference: cleaned });
                    clearError("branch_preference");
                  }}
                  options={branchOptions}
                  maxLength={100}
                  placeholder="e.g. Computer Engineering"
                />
                {fieldErrors.branch_preference && (
                  <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.branch_preference}</p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Purpose of Meeting <span style={{ color: "var(--danger-500)" }}>*</span>
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
                  <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.meeting_purpose}</p>
                )}
              </div>

              {meetingPurposeOption === "Other" && (
                <div>
                  <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                    Tell us your purpose <span style={{ color: "var(--danger-500)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="meeting_purpose"
                    required
                    minLength={3}
                    maxLength={150}
                    value={formData.meeting_purpose}
                    onChange={(e) => { handleInputChange(e); clearError("meeting_purpose_text"); }}
                    className="input-base"
                    placeholder="Describe what you want help with"
                  />
                  {fieldErrors.meeting_purpose_text && (
                    <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.meeting_purpose_text}</p>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Meeting Date <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                {!slotConfig.enabled && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Booking sessions are currently closed.
                  </div>
                )}
                <div className="rounded-xl p-3" style={{ border: "1px solid var(--slate-200)", background: "var(--slate-50)" }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <button
                      type="button"
                      disabled={!canGoToPreviousMonth}
                      onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}
                      className="h-9 w-9 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      style={{ border: "1px solid var(--slate-200)", background: "var(--bg-primary)", color: "var(--slate-700)" }}
                      aria-label="Previous month"
                    >
                      &lt;
                    </button>
                    <p className="font-semibold" style={{ color: "var(--slate-900)" }}>{getMonthLabel(calendarMonth)}</p>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}
                      className="h-9 w-9 rounded-lg text-sm font-medium transition-colors"
                      style={{ border: "1px solid var(--slate-200)", background: "var(--bg-primary)", color: "var(--slate-700)" }}
                      aria-label="Next month"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-1" style={{ color: "var(--slate-500)" }}>
                    {WEEKDAY_LABELS.map((day) => (
                      <span key={day} className="py-1">{day}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDates.map((date, index) => {
                      if (!date) {
                        return <div key={`blank-${index}`} className="aspect-square" />;
                      }

                      const { day } = parseDateString(date);
                      const isSelected = selectedDate === date;
                      const isBeforeMin = date < minDate;
                      const isClosed = slotConfig.special_closed_dates.includes(date);
                      const isUnavailableDay = isNonWorkingDay(date, slotConfig);
                      const isDisabled = !slotConfig.enabled || isBeforeMin || isUnavailableDay;
                      const isToday = date === getNowIST().toISOString().slice(0, 10);
                      let dateClass =
                        "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500";

                      if (isDisabled) {
                        dateClass = isClosed || isUnavailableDay
                          ? "bg-red-50 text-red-300 border-red-100 cursor-not-allowed"
                          : "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed";
                      }
                      if (isSelected) {
                        dateClass = "text-white border-transparent shadow-md";
                        // We'll add inline style for selected bg
                      }

                      return (
                        <button
                          key={date}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDateSelect(date)}
                          className={`aspect-square rounded-lg border text-sm font-semibold transition-all ${dateClass}`}
                          style={isSelected ? { background: "var(--primary-600)", borderColor: "var(--primary-600)" } : undefined}
                          aria-label={`${date}${isDisabled ? " unavailable" : " available"}`}
                        >
                          <span>{day}</span>
                          {isToday && <span className="block text-[9px] font-medium leading-none">Today</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs mt-3">
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-400" />Available</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-200" />Closed</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-gray-200" />Unavailable</span>
                  </div>
                </div>
                <input type="hidden" name="meeting_date" value={selectedDate} />
                {fieldErrors.meeting_date && (
                  <p className="text-xs mt-1" style={{ color: "var(--danger-500)" }}>{fieldErrors.meeting_date}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium mb-2 text-sm" style={{ color: "var(--slate-700)" }}>
                  Meeting Time <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                {!selectedDate ? (
                  <p className="text-sm italic" style={{ color: "var(--slate-600)" }}>
                    Please select a date first.
                  </p>
                ) : slotsLoading ? (
                  <p className="text-sm italic" style={{ color: "var(--slate-600)" }}>Loading slots…</p>
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
                      {slotConfig.slots.map((slot) => {
                        const isBooked = bookedSlots.includes(slot);
                        const isUnavailable =
                          !getAvailableSlots(selectedDate, slotConfig).includes(slot);
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
                            "text-white border-transparent shadow-md scale-105";
                          // inline style added below for primary bg
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
                            style={isSelected ? { background: "var(--primary-600)", borderColor: "var(--primary-600)" } : undefined}
                          >
                            {formatTimeLabel(slot)}
                          </button>
                        );
                      })}
                    </div>
                    {!selectedTime && (
                      <p className="text-xs mt-2" style={{ color: "var(--slate-500)" }}>Select a green slot to book.</p>
                    )}
                    {slotError && (
                      <p className="text-xs mt-2 font-medium" style={{ color: "var(--danger-500)" }}>{slotError}</p>
                    )}
                    {fieldErrors.meeting_time && (
                      <p className="text-xs mt-2" style={{ color: "var(--danger-500)" }}>{fieldErrors.meeting_time}</p>
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
                disabled={!slotConfig.enabled}
                className="w-full text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }}
              >
                {!slotConfig.enabled ? "Bookings Closed" : "Review Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
