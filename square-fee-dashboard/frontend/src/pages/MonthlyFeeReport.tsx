import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import DateRangePicker, { defaultMonthRange, type DateRange } from '../components/DateRangePicker';
import MetricCard from '../components/MetricCard';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import { formatCents, formatPercent } from '../lib/format';
import type { MonthlyFeeReport as Report, ReportSnapshot } from '../types';

export default function MonthlyFeeReport() {
  const [range, setRange] = useState<DateRange>(defaultMonthRange());
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);

  const loadSnapshots = () => {
    api.getSnapshots().then(setSnapshots).catch(() => setSnapshots([]));
  };
  useEffect(loadSnapshots, []);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getMonthlyFee(range.startDate, range.endDate)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [range.startDate, range.endDate]);

  const saveSnapshot = async () => {
    setSaveMsg(null);
    try {
      await api.saveSnapshot(range.startDate, range.endDate);
      setSaveMsg('Report snapshot saved.');
      loadSnapshots();
    } catch (e: any) {
      setSaveMsg(`Save failed: ${e.message}`);
    }
  };

  return (
    <Layout
      title="Monthly Location Fee Report"
      subtitle="Calculate the location fee owed for a date range"
      actions={
        <div className="flex gap-2">
          <a
            href={api.csvUrl(range.startDate, range.endDate)}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Export CSV
          </a>
          <button
            onClick={saveSnapshot}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Save Snapshot
          </button>
        </div>
      }
    >
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {saveMsg && <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">{saveMsg}</div>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard label="Gross Sales" value={formatCents(data.grossSales)} accent="blue" />
            <MetricCard label="Fee-Liable Sales" value={formatCents(data.feeLiableSales)} accent="blue" />
            <MetricCard label="Fee Percentage" value={formatPercent(data.feePercentage)} />
            <MetricCard label="Final Fee Owed" value={formatCents(data.feeOwed)} accent="green" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Fee Calculation Breakdown</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <Row label="Gross sales" value={formatCents(data.grossSales)} />
                <Row label="− Refund deductions" value={`(${formatCents(data.refunds)})`} muted />
                <Row
                  label={`− Discount deductions ${data.rulesApplied.discountsReduce ? '' : '(not applied)'}`}
                  value={`(${formatCents(data.rulesApplied.discountsReduce ? data.discounts : 0)})`}
                  muted
                />
                <Row label="− Excluded category deductions" value={`(${formatCents(data.excludedCategorySales)})`} muted />
                <Row
                  label={`− Taxes ${data.rulesApplied.taxesExcluded ? '' : '(not excluded)'}`}
                  value={`(${formatCents(data.rulesApplied.taxesExcluded ? data.taxes : 0)})`}
                  muted
                />
                <Row label="= Fee-liable sales" value={formatCents(data.feeLiableSales)} bold />
                <Row label={`× Fee percentage (${formatPercent(data.feePercentage)})`} value="" />
                <Row label="= Final fee owed" value={formatCents(data.feeOwed)} bold accent />
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">
              Refund deduction method: {data.rulesApplied.refundDeductionMethod}. Taxes total this period:{' '}
              {formatCents(data.taxes)}.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 px-4 text-right">Gross Sales</th>
                    <th className="py-2 px-4 text-right">Discounts</th>
                    <th className="py-2 px-4 text-right">Taxes</th>
                    <th className="py-2 px-4 text-right">Net Sales</th>
                    <th className="py-2 pl-4 text-center">Excluded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.categoryBreakdown.map((c) => (
                    <tr key={c.categoryId ?? 'uncat'} className={c.excluded ? 'bg-amber-50' : ''}>
                      <td className="py-2 pr-4 font-medium">{c.categoryName}</td>
                      <td className="py-2 px-4 text-right">{formatCents(c.grossSales)}</td>
                      <td className="py-2 px-4 text-right">{formatCents(c.discounts)}</td>
                      <td className="py-2 px-4 text-right">{formatCents(c.taxes)}</td>
                      <td className="py-2 px-4 text-right">{formatCents(c.netSales)}</td>
                      <td className="py-2 pl-4 text-center">
                        {c.excluded ? (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">Excluded</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Saved Report Snapshots</h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-slate-400">
            No snapshots saved yet. Use “Save Snapshot” to store the current report.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Saved At</th>
                  <th className="py-2 px-4">Start</th>
                  <th className="py-2 px-4">End</th>
                  <th className="py-2 pl-4 text-right">Fee Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 pr-4">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-4">{s.startDate}</td>
                    <td className="py-2 px-4">{s.endDate}</td>
                    <td className="py-2 pl-4 text-right font-medium">{formatCents(s.feeOwed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Row({ label, value, muted, bold, accent }: { label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <tr>
      <td className={`py-2 ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-500' : ''}`}>{label}</td>
      <td className={`py-2 text-right ${bold ? 'font-semibold' : ''} ${accent ? 'text-emerald-600 text-lg' : ''} ${muted ? 'text-slate-500' : ''}`}>{value}</td>
    </tr>
  );
}
