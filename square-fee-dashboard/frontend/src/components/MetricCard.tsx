import type { ReactNode } from 'react';

export default function MetricCard({ label, value, hint, accent }: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'default' | 'green' | 'red' | 'blue' | 'amber';
}) {
  const accentClass = {
    default: 'text-slate-900',
    green: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-brand-600',
    amber: 'text-amber-600',
  }[accent ?? 'default'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accentClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
