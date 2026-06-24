import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import { formatNumber } from '../lib/format';
import type { SyncStatus as Status, WebhookEvent } from '../types';

export default function SyncStatus() {
  const [data, setData] = useState<Status | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getSyncStatus()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.getWebhookEvents().then(setWebhooks).catch(() => setWebhooks([]));
  };

  useEffect(load, []);

  const syncSquare = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.syncSquare();
      setMsg('Square sync completed.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout
      title="Sync Status"
      subtitle="Manual read-only sync from Square"
      actions={
        <div className="flex gap-2">
          <button onClick={syncSquare} disabled={busy} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Syncing…' : 'Sync from Square'}
          </button>
        </div>
      }
    >
      {msg && <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">{msg}</div>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && !error && (
        <div className="space-y-6">
          <div className={`rounded-lg px-4 py-3 text-sm ${data.squareConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {data.squareConfigured
              ? 'Square credentials detected. Click "Sync from Square" to import catalog, orders, payments, and refunds (read-only).'
              : 'No Square credentials configured. Add credentials in backend/.env, then run a sync to load data.'}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Orders Synced" value={formatNumber(data.counts.orders)} />
            <MetricCard label="Payments Synced" value={formatNumber(data.counts.payments)} />
            <MetricCard label="Refunds Synced" value={formatNumber(data.counts.refunds)} />
            <MetricCard label="Catalog Items Synced" value={formatNumber(data.counts.catalogItems)} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-2">Last Sync</h2>
            {data.lastSync ? (
              <div className="text-sm text-slate-600 space-y-1">
                <div>Date: <span className="font-medium">{new Date(data.lastSync.createdAt).toLocaleString()}</span></div>
                <div>Type: <span className="font-medium">{data.lastSync.syncType}</span></div>
                <div>Status: <span className="font-medium">{data.lastSync.status}</span></div>
                {data.lastSync.error && <div className="text-red-600">Error: {data.lastSync.error}</div>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No sync has run yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Sync Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 px-4">Type</th>
                    <th className="py-2 px-4 text-right">Orders</th>
                    <th className="py-2 px-4 text-right">Payments</th>
                    <th className="py-2 px-4 text-right">Refunds</th>
                    <th className="py-2 px-4 text-right">Catalog</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-4">{r.syncType}</td>
                      <td className="py-2 px-4 text-right">{r.ordersSynced}</td>
                      <td className="py-2 px-4 text-right">{r.paymentsSynced}</td>
                      <td className="py-2 px-4 text-right">{r.refundsSynced}</td>
                      <td className="py-2 px-4 text-right">{r.catalogItemsSynced}</td>
                      <td className="py-2 px-4">
                        <span className={r.status === 'success' ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {data.recent.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No sync history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-1">Recent Webhook Events</h2>
            <p className="text-sm text-slate-500 mb-4">
              Square notifications received at <code>POST /api/webhooks/square</code> (HMAC-verified when a signature key is configured).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Received</th>
                    <th className="py-2 px-4">Type</th>
                    <th className="py-2 px-4">Event ID</th>
                    <th className="py-2 px-4 text-center">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooks.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2 pr-4">{new Date(w.receivedAt).toLocaleString()}</td>
                      <td className="py-2 px-4">{w.eventType ?? '—'}</td>
                      <td className="py-2 px-4 font-mono text-xs">{w.eventId ?? '—'}</td>
                      <td className="py-2 px-4 text-center">
                        {w.signatureValid ? (
                          <span className="text-emerald-600">verified</span>
                        ) : (
                          <span className="text-amber-600">unverified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {webhooks.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No webhook events received yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
