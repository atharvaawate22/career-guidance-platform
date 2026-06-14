// Lightweight, theme-consistent route loading fallback rendered by Next.js
// `loading.tsx` files while a route segment's data resolves.
export default function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 py-16">
      <div
        className="w-9 h-9 rounded-full animate-spin"
        style={{
          border: "3px solid var(--primary-100)",
          borderTopColor: "var(--primary-600)",
        }}
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm font-medium" style={{ color: "var(--slate)" }}>
        {label}
      </p>
    </div>
  );
}
