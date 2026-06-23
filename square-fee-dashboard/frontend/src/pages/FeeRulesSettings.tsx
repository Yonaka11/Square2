import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Loading, ErrorState } from '../components/StateViews';
import { api } from '../api/client';
import type { Category, FeeRules, RefundDeductionMethod } from '../types';

export default function FeeRulesSettings() {
  const [rules, setRules] = useState<FeeRules | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getFeeRules(), api.getCategories()])
      .then(([r, c]) => {
        setRules(r);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await api.updateFeeRules({
        feePercentage: rules.fee_percentage,
        excludedCategoryIds: rules.excluded_category_ids,
        taxesExcluded: !!rules.taxes_excluded,
        discountsReduce: !!rules.discounts_reduce,
        refundDeductionMethod: rules.refund_deduction_method,
      });
      setRules(updated);
      setSaveMsg('Settings saved to SQLite.');
    } catch (e: any) {
      setSaveMsg(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (id: string) => {
    if (!rules) return;
    const has = rules.excluded_category_ids.includes(id);
    setRules({
      ...rules,
      excluded_category_ids: has
        ? rules.excluded_category_ids.filter((x) => x !== id)
        : [...rules.excluded_category_ids, id],
    });
  };

  return (
    <Layout title="Fee Rules Settings" subtitle="Configure how the location fee is calculated">
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}
      {rules && !loading && !error && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Fee percentage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={rules.fee_percentage}
                onChange={(e) => setRules({ ...rules, fee_percentage: Number(e.target.value) })}
                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-slate-500">% of fee-liable sales (default 25%)</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-medium text-slate-700 mb-3">Excluded categories</div>
            <p className="text-xs text-slate-500 mb-3">Sales in excluded categories are removed from fee-liable sales.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={rules.excluded_category_ids.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!rules.taxes_excluded}
                onChange={(e) => setRules({ ...rules, taxes_excluded: e.target.checked ? 1 : 0 })}
              />
              <span><span className="font-medium">Exclude taxes</span> from fee-liable sales</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!rules.discounts_reduce}
                onChange={(e) => setRules({ ...rules, discounts_reduce: e.target.checked ? 1 : 0 })}
              />
              <span><span className="font-medium">Discounts reduce</span> fee-liable sales</span>
            </label>
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">Refund deduction method</div>
              <div className="flex gap-4">
                {(['refund_date', 'original_sale_date'] as RefundDeductionMethod[]).map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="refundMethod"
                      checked={rules.refund_deduction_method === m}
                      onChange={() => setRules({ ...rules, refund_deduction_method: m })}
                    />
                    {m === 'refund_date' ? 'By refund date' : 'By original sale date'}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saveMsg && <span className="text-sm text-slate-600">{saveMsg}</span>}
          </div>
          <p className="text-xs text-slate-400">Last updated: {new Date(rules.updated_at).toLocaleString()}</p>
        </div>
      )}
    </Layout>
  );
}
