// Month + custom date-range selector used by reports and analytics.
export interface DateRange {
  startDate: string;
  endDate: string;
}

export function defaultMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toIso(start), endDate: toIso(end) };
}

export function last90DaysRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
  return { startDate: toIso(start), endDate: toIso(now) };
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange(year: number, month: number): DateRange {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { startDate: toIso(start), endDate: toIso(end) };
}

export default function DateRangePicker({ value, onChange }: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Quick month</label>
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number);
            onChange(monthRange(y, m));
          }}
          value=""
        >
          <option value="" disabled>
            Select a month…
          </option>
          {months.map((m) => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Start date</label>
        <input
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">End date</label>
        <input
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={() => onChange(last90DaysRange())}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Last 90 days
      </button>
    </div>
  );
}
