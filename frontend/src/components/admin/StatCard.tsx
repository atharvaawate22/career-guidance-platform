"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string; // e.g. "emerald", "amber", "violet", "cyan"
  subtitle?: string;
}

const COLOR_MAP: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
  emerald: { bg: "from-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/20" },
  amber: { bg: "from-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/20" },
  violet: { bg: "from-violet-500/10 to-violet-500/5", iconBg: "bg-violet-500", text: "text-violet-400", border: "border-violet-500/20" },
  cyan: { bg: "from-cyan-500/10 to-cyan-500/5", iconBg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/20" },
  rose: { bg: "from-rose-500/10 to-rose-500/5", iconBg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/20" },
  blue: { bg: "from-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/20" },
};

export default function StatCard({ label, value, icon, color, subtitle }: StatCardProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.violet;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} backdrop-blur-sm p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}>
      {/* Glow effect */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 ${c.iconBg} rounded-full opacity-10 blur-2xl`} />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {subtitle && <p className={`text-xs mt-1 ${c.text} font-medium`}>{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${c.iconBg} rounded-xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
