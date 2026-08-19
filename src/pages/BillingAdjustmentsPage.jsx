import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchBillingAdjustments, createBillingAdjustment } from '../store/billingAdjustmentSlice';
import { Button } from '../components/ui/button';

const REASON_LABEL = {
  volume_discount: 'Volume discount',
  penalty: 'Penalty',
  quality_issue: 'Quality issue',
  other: 'Other',
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function money(v) {
  return `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;
}

const EMPTY_FORM = { adjustmentDate: today(), type: 'credit', amount: '', reason: 'volume_discount', notes: '' };

export default function BillingAdjustmentsPage() {
  const dispatch = useAppDispatch();
  const { data: adjustments, loading } = useAppSelector((s) => s.billingAdjustments);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { dispatch(fetchBillingAdjustments()); }, [dispatch]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(createBillingAdjustment({
      adjustmentDate: form.adjustmentDate,
      type: form.type,
      amount: Number(form.amount),
      reason: form.reason,
      notes: form.notes.trim() || null,
    }));
    setSaving(false);
    if (createBillingAdjustment.fulfilled.match(result)) {
      setForm(EMPTY_FORM);
    } else {
      setError(result.error?.message || 'Failed to add adjustment.');
    }
  }

  const credits = adjustments.filter((a) => a.type === 'credit').reduce((s, a) => s + parseFloat(a.amount), 0);
  const debits = adjustments.filter((a) => a.type === 'debit').reduce((s, a) => s + parseFloat(a.amount), 0);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        What you actually pay the processing lab for tests can differ from the computed billing (test cost snapshotted per order) — a credit (volume discount, goodwill) lowers it, a debit (penalty, extra charge) raises it. Log those here; reports net them against computed billing automatically.
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={form.adjustmentDate}
            onChange={(e) => setForm((f) => ({ ...f, adjustmentDate: e.target.value }))}
            max={today()}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="credit">Credit (−)</option>
            <option value="debit">Debit (+)</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
          <input
            type="number" min="0.01" step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
          <select
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {Object.entries(REASON_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Adjustment'}</Button>
      </form>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : adjustments.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No billing adjustments recorded yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{formatDate(a.adjustment_date)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${a.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {a.type === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{REASON_LABEL[a.reason]}</td>
                  <td className="px-4 py-2 font-medium">{money(a.amount)}</td>
                  <td className="px-4 py-2 text-gray-400">{a.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="px-4 py-2 font-medium" colSpan={3}>Total credits / debits</td>
                <td className="px-4 py-2 font-bold">−{money(credits)} / +{money(debits)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
