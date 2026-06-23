import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Layout from '../components/Layout';
import DateRangePicker, { last90DaysRange, type DateRange } from '../components/DateRangePicker';
import MetricCard from '../components/MetricCard';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import { formatCents, formatHour, formatNumber } from '../lib/format';
import type { SalesAnalytics as Analytics } from '../types';

const dollars = (cents: number) => cents / 100;

export default function SalesAnalytics() {
  const [range, setRange] = useState<DateRange>(last90DaysRange());
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getSalesAnalytics(range.startDate, range.endDate)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [range.startDate, range.endDate]);

  return (
    <Layout title="Sales Analytics" subtitle="Trends, peaks, and product performance">
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Refund Rate" value={`${data.refundRate}%`} accent="red" />
            <MetricCard label="Discount Impact" value={`${data.discountImpact}%`} accent="amber" />
            <MetricCard
              label="Avg Ticket (period)"
              value={formatCents(
                data.averageTicketOverTime.length
                  ? Math.round(
                      data.averageTicketOverTime.reduce((s, d) => s + d.averageTicket, 0) /
                        data.averageTicketOverTime.length
                    )
                  : 0
              )}
            />
          </div>

          <ChartCard title="Sales by Day">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.salesByDay.map((d) => ({ ...d, sales: dollars(d.sales) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Sales by Day of Week">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.salesByDayOfWeek.map((d) => ({ ...d, sales: dollars(d.sales) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dayOfWeek" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Sales by Hour">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.salesByHour.map((d) => ({ ...d, label: formatHour(d.hour), sales: dollars(d.sales) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="sales" fill="#1e40af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Average Ticket Over Time">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.averageTicketOverTime.map((d) => ({ ...d, averageTicket: dollars(d.averageTicket) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Line type="monotone" dataKey="averageTicket" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankTable title="Busiest Days" rows={data.busiestDays.map((d) => ({ label: d.date, value: formatCents(d.sales) }))} />
            <RankTable title="Slowest Days" rows={data.slowestDays.map((d) => ({ label: d.date, value: formatCents(d.sales) }))} />
            <RankTable title="Busiest Hours" rows={data.busiestHours.map((d) => ({ label: formatHour(d.hour), value: formatCents(d.sales) }))} />
            <RankTable title="Slowest Hours" rows={data.slowestHours.map((d) => ({ label: formatHour(d.hour), value: formatCents(d.sales) }))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankTable
              title="Top Items by Revenue"
              rows={data.topItemsByRevenue.map((d) => ({ label: d.name, value: formatCents(d.revenue) }))}
            />
            <RankTable
              title="Top Items by Quantity"
              rows={data.topItemsByQuantity.map((d) => ({ label: d.name, value: formatNumber(d.quantity) }))}
            />
          </div>

          <RankTable
            title="Top Categories"
            rows={data.topCategories.map((d) => ({ label: d.categoryName, value: formatCents(d.revenue) }))}
          />
        </div>
      )}
    </Layout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function RankTable({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={`${r.label}-${i}`}>
              <td className="py-1.5 text-slate-600">{i + 1}. {r.label}</td>
              <td className="py-1.5 text-right font-medium">{r.value}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-2 text-slate-400">No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
