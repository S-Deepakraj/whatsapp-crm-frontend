import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTests } from '../store/testCatalogSlice';
import { fetchOverrides, createOverride, updateOverride } from '../store/testCostOverrideSlice';
import { Button } from '../components/ui/button';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKEND = [0, 6];

function formatDays(days) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return 'Weekend (Sat–Sun)';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

const EMPTY_FORM = { testCatalogId: '', overrideRate: '', daysOfWeek: WEEKEND, label: '' };

export default function TestCostOverridesPage() {
  const dispatch = useAppDispatch();
  const tests = useAppSelector((s) => s.testCatalog.data);
  const { data: overrides, loading } = useAppSelector((s) => s.testCostOverrides);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);
  useEffect(() => { dispatch(fetchOverrides({ includeInactive: showInactive })); }, [dispatch, showInactive]);

  function toggleDay(d) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d].sort(),
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.testCatalogId) return setError('Pick a test');
    if (!form.overrideRate || Number(form.overrideRate) < 0) return setError('Enter a valid rate');
    if (form.daysOfWeek.length === 0) return setError('Pick at least one day');

    setSaving(true);
    setError(null);
    const result = await dispatch(createOverride({
      testCatalogId: Number(form.testCatalogId),
      overrideRate: Number(form.overrideRate),
      daysOfWeek: form.daysOfWeek,
      label: form.label.trim() || null,
    }));
    setSaving(false);
    if (createOverride.fulfilled.match(result)) {
      setForm(EMPTY_FORM);
    } else {
      setError(result.error?.message || 'Failed to add override.');
    }
  }

  function toggleActive(o) {
    dispatch(updateOverride({ id: o.id, active: !o.active }));
  }

  return (
    <div className="p-4 md:p-6">
      <Link to="/test-catalog" className="text-xs text-gray-500 hover:underline">← Back to Test Catalog</Link>
      <h1 className="text-2xl font-bold mt-1 mb-1">Special / Weekend Rates</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        When the processing lab runs a promo on specific tests for specific days (e.g. FBS/PPBS/RBS at ₹1 on weekends), set it up here.
        It automatically replaces the normal B2B rate in cost calculations for orders booked on those days — no manual per-order adjustment needed.
        Disable it (or add a new one) whenever the offer ends or changes; only one active rate applies per test at a time.
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Test</label>
            <select
              value={form.testCatalogId}
              onChange={(e) => setForm((f) => ({ ...f, testCatalogId: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a test</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1">Rate (₹)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.overrideRate}
              onChange={(e) => setForm((f) => ({ ...f, overrideRate: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Label <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Weekend Offer"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Applies on</label>
          <div className="flex items-center gap-2 flex-wrap">
            {DAY_LABELS.map((label, d) => (
              <label key={d} className={`text-xs px-2.5 py-1.5 rounded border cursor-pointer ${form.daysOfWeek.includes(d) ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                <input type="checkbox" className="hidden" checked={form.daysOfWeek.includes(d)} onChange={() => toggleDay(d)} />
                {label}
              </label>
            ))}
            <Button type="button" variant="link" size="xs" onClick={() => setForm((f) => ({ ...f, daysOfWeek: WEEKEND }))} className="text-blue-600">
              Weekend only
            </Button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Override'}</Button>
        </div>
      </form>

      <label className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show disabled overrides too
      </label>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : overrides.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No cost overrides yet — add one above.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Test</th>
                <th className="px-4 py-2 font-medium">Rate</th>
                <th className="px-4 py-2 font-medium">Applies on</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className={`border-b last:border-0 ${!o.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 font-medium">{o.test_name}</td>
                  <td className="px-4 py-2">₹{parseFloat(o.override_rate).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDays(o.days_of_week)}</td>
                  <td className="px-4 py-2 text-gray-400">{o.label || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${o.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {o.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="link" size="xs" onClick={() => toggleActive(o)} className="text-gray-500">
                      {o.active ? 'Disable' : 'Re-enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
