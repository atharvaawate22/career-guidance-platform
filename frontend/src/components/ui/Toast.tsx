"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ── Types ──────────────────────────────────────────────────────────────── */

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (data: Omit<ToastData, "id">) => void;
}

/* ── Context ────────────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

const icons: Record<ToastType, ReactNode> = {
  success: (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const borderColors: Record<ToastType, string> = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
};

/* ── Single Toast ───────────────────────────────────────────────────────── */

function ToastItem({ toast: t, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const duration = t.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(t.id), 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [t.id, duration, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(t.id), 250);
  };

  return (
    <div
      role={t.type === "error" || t.type === "warning" ? "alert" : "status"}
      className={`relative flex items-start gap-3 w-80 sm:w-96 bg-slate-800 border border-slate-700 ${borderColors[t.type]} border-l-4 rounded-xl p-4 shadow-xl ${exiting ? "animate-slide-out-right" : "animate-slide-in-right"}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{t.title}</p>
        {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-slate-500 hover:text-white transition-colors p-0.5"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-500 rounded-full"
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toast = useCallback((data: Omit<ToastData, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { ...data, id }]); // Max 5 toasts
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <ToastItem toast={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
