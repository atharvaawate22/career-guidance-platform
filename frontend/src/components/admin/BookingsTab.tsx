"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { formatDateTime } from "@/lib/formatDateTime";

export interface Booking {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_purpose: string;
  meeting_time: string;
  meet_link: string;
  booking_status: string;
  email_status: string;
  created_at: string;
}

interface BookingsTabProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function BookingsTab({
  adminFetch,
  adminWriteFetch,
  onSessionExpired,
}: BookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);

  const fetchBookings = async (page = bookingsPage) => {
    try {
      setBookingsLoading(true);
      const response = await adminFetch(
        `${API_BASE_URL}/api/admin/bookings?page=${page}&limit=50`
      );
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setBookings(data.data as Booking[]);
        setBookingsPage(data.meta?.page ?? 1);
        setBookingsTotalPages(data.meta?.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBookings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/bookings/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();

      if (data.success) {
        setBookingSuccess("Booking status updated!");
        void fetchBookings();
      } else {
        setBookingError(data.error?.message || "Failed to update status");
      }
    } catch {
      setBookingError("Failed to connect to server");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/bookings/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();

      if (data.success) {
        setBookingSuccess("Booking deleted successfully!");
        void fetchBookings();
      } else {
        setBookingError(data.error?.message || "Failed to delete booking");
      }
    } catch {
      setBookingError("Failed to connect to server");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Manage Bookings</h2>

      {bookingError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {bookingError}
        </div>
      )}

      {bookingSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {bookingSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {bookingsLoading ? (
          <p className="p-6 text-gray-500">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="p-6 text-gray-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {booking.student_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {booking.email}
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-600">
                          Percentile:{" "}
                          <span className="font-semibold">
                            {booking.percentile}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          Category:{" "}
                          <span className="font-semibold">
                            {booking.category}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          Branch:{" "}
                          <span className="font-semibold">
                            {booking.branch_preference}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          Purpose:{" "}
                          <span className="font-semibold">
                            {booking.meeting_purpose}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(booking.meeting_time)}
                      </div>
                      <a
                        href={booking.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Meeting Link
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.booking_status}
                        onChange={(e) =>
                          handleUpdateBookingStatus(booking.id, e.target.value)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-0 ${
                          booking.booking_status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.booking_status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {bookingsTotalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchBookings(bookingsPage - 1)}
            disabled={bookingsPage <= 1 || bookingsLoading}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {bookingsPage} of {bookingsTotalPages}
          </span>
          <button
            onClick={() => fetchBookings(bookingsPage + 1)}
            disabled={bookingsPage >= bookingsTotalPages || bookingsLoading}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
