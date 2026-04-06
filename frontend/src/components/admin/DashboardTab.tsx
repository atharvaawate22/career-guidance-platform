"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { formatDateTime } from "@/lib/formatDateTime";

interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
}

interface Booking {
  id: string;
  student_name: string;
  email: string;
  meeting_time: string;
  booking_status: string;
}

interface DashboardTabProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function DashboardTab({
  adminFetch,
  onSessionExpired,
}: DashboardTabProps) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [faqsCount, setFaqsCount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch updates (public endpoint)
      try {
        const res = await fetch(`${API_BASE_URL}/api/updates`);
        const data = await res.json();
        if (data.success) setUpdates(data.data as Update[]);
      } catch {
        // non-critical
      }

      // Fetch bookings (admin endpoint)
      try {
        setBookingsLoading(true);
        const res = await adminFetch(
          `${API_BASE_URL}/api/admin/bookings?page=1&limit=50`
        );
        if (res.status === 401) {
          onSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.success) setBookings(data.data as Booking[]);
      } catch {
        // non-critical
      } finally {
        setBookingsLoading(false);
      }

      // Fetch FAQs count (admin endpoint)
      try {
        const res = await adminFetch(`${API_BASE_URL}/api/admin/faqs`);
        if (res.status === 401) {
          onSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.success)
          setFaqsCount((data.data as unknown[]).length);
      } catch {
        // non-critical
      }
    };

    void fetchAll();
  }, [adminFetch, onSessionExpired]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Updates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {updates.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📰
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Bookings
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {bookings.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              📅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Pending Bookings
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {
                  bookings.filter((b) => b.booking_status === "pending")
                    .length
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">
              ⏳
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total FAQs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {faqsCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-sm font-bold text-cyan-700">
              FAQ
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Recent Bookings
        </h3>
        {bookingsLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet</p>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {booking.student_name}
                  </p>
                  <p className="text-sm text-gray-600">{booking.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {formatDateTime(booking.meeting_time)}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                      booking.booking_status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : booking.booking_status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {booking.booking_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
