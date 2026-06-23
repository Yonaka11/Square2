import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import { formatCents, formatNumber } from '../lib/format';
import type { DashboardOverview as Overview } from '../types';

export default function DashboardOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <Layout title="Dashboard Overview" subtitle="Key metrics for the current month">
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && !loading && !error && (
        <>
          <div className="mb-4 text-sm text-slate-500">
            Period: <span className="font-medium text-slate-700">{data.startDate}</span> to{' '}
            <span className="font-medium text-slate-700">{data.endDate}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Gross Sales" value={formatCents(data.grossSales)} accent="blue" />
            <MetricCard label="Refunds" value={formatCents(data.refunds)} accent="red" />
            <MetricCard label="Discounts" value={formatCents(data.discounts)} accent="amber" />
            <MetricCard label="Excluded Category Sales" value={formatCents(data.excludedCategorySales)} />
            <MetricCard label="Fee-Liable Sales" value={formatCents(data.feeLiableSales)} accent="blue" />
            <MetricCard label="Estimated Fee Owed" value={formatCents(data.estimatedFeeOwed)} accent="green" hint="At current fee rules" />
            <MetricCard label="Number of Orders" value={formatNumber(data.orderCount)} />
            <MetricCard label="Average Ticket Size" value={formatCents(data.averageTicket)} />
          </div>
        </>
      )}
    </Layout>
  );
}
