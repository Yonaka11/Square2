import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import { formatCents } from '../lib/format';
import type { CatalogItem, Category } from '../types';

interface FormState {
  id?: string;
  name: string;
  categoryId: string;
  priceDollars: string;
  sku: string;
  barcode: string;
  description: string;
  trackInventory: boolean;
  quantity: string;
  readyToSync: boolean;
}

const emptyForm: FormState = {
  name: '',
  categoryId: '',
  priceDollars: '',
  sku: '',
  barcode: '',
  description: '',
  trackInventory: false,
  quantity: '0',
  readyToSync: false,
};

export default function CatalogManager() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'missing' | 'uncategorized'>('all');

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getCatalogItems(), api.getCategories()])
      .then(([i, c]) => {
        setItems(i);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (item: CatalogItem) => {
    setEditing(true);
    setForm({
      id: item.id,
      name: item.name,
      categoryId: item.category_id ?? '',
      priceDollars: (item.price_money / 100).toFixed(2),
      sku: item.sku ?? '',
      barcode: item.barcode ?? '',
      description: item.description ?? '',
      trackInventory: !!item.track_inventory,
      quantity: String(item.quantity),
      readyToSync: !!item.ready_to_sync,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const submit = async () => {
    setMsg(null);
    const payload = {
      name: form.name,
      categoryId: form.categoryId || null,
      priceMoney: Math.round(parseFloat(form.priceDollars || '0') * 100),
      sku: form.sku || null,
      barcode: form.barcode || null,
      description: form.description || null,
      trackInventory: form.trackInventory,
      quantity: parseInt(form.quantity || '0', 10),
      readyToSync: form.readyToSync,
    };
    try {
      if (editing && form.id) {
        await api.updateCatalogItem(form.id, payload);
        setMsg('Catalog item updated.');
      } else {
        await api.createCatalogItem(payload);
        setMsg('Draft catalog item created.');
      }
      reset();
      load();
    } catch (e: any) {
      setMsg(`Save failed: ${e.message}`);
    }
  };

  const visibleItems = items.filter((i) => {
    if (tab === 'missing') return !i.barcode;
    if (tab === 'uncategorized') return !i.category_id;
    return true;
  });

  const missingCount = items.filter((i) => !i.barcode).length;
  const uncatCount = items.filter((i) => !i.category_id).length;

  return (
    <Layout title="Catalog Manager" subtitle="Manage local catalog items (sync to Square later)">
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Catalog Item' : 'Add Draft Catalog Item'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Category">
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Price (USD)">
                <input className="input" type="number" step="0.01" value={form.priceDollars} onChange={(e) => setForm({ ...form, priceDollars: e.target.value })} />
              </Field>
              <Field label="SKU">
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Field>
              <Field label="Barcode / UPC">
                <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </Field>
              <Field label="Starting Quantity">
                <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Field>
              <Field label="Description">
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} />
                  Track inventory
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.readyToSync} onChange={(e) => setForm({ ...form, readyToSync: e.target.checked })} />
                  Ready to sync to Square
                </label>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={submit} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                {editing ? 'Update Item' : 'Create Draft'}
              </button>
              {editing && (
                <button onClick={reset} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                  Cancel
                </button>
              )}
              {msg && <span className="text-sm text-slate-600">{msg}</span>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex gap-2 border-b border-slate-200 px-4 pt-3">
              <Tab active={tab === 'all'} onClick={() => setTab('all')}>All Items ({items.length})</Tab>
              <Tab active={tab === 'missing'} onClick={() => setTab('missing')}>Missing Barcode ({missingCount})</Tab>
              <Tab active={tab === 'uncategorized'} onClick={() => setTab('uncategorized')}>Uncategorized ({uncatCount})</Tab>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 px-4">Category</th>
                    <th className="py-2 px-4 text-right">Price</th>
                    <th className="py-2 px-4">SKU</th>
                    <th className="py-2 px-4">Barcode</th>
                    <th className="py-2 px-4 text-right">Qty</th>
                    <th className="py-2 px-4 text-center">Status</th>
                    <th className="py-2 pl-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 pr-4 font-medium">{i.name}</td>
                      <td className="py-2 px-4">{i.category_name ?? <span className="text-amber-600">Uncategorized</span>}</td>
                      <td className="py-2 px-4 text-right">{formatCents(i.price_money)}</td>
                      <td className="py-2 px-4">{i.sku ?? '—'}</td>
                      <td className="py-2 px-4">{i.barcode ?? <span className="text-red-500">missing</span>}</td>
                      <td className="py-2 px-4 text-right">{i.track_inventory ? i.quantity : '—'}</td>
                      <td className="py-2 px-4 text-center">
                        {i.is_draft ? <Badge color="slate">Draft</Badge> : <Badge color="blue">Synced source</Badge>}{' '}
                        {i.ready_to_sync ? <Badge color="green">Ready</Badge> : null}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <button onClick={() => startEdit(i)} className="text-brand-600 hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {visibleItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">No items in this view.</td>
                    </tr>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ color, children }: { color: 'slate' | 'blue' | 'green'; children: React.ReactNode }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[color]}`}>{children}</span>;
}
