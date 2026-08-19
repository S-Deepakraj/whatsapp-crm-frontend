import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchPayments, createPayment } from '../store/paymentSlice';
import { Button } from '../components/ui/button';

const METHOD_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card', other: 'Other' };

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { orderId: '', amount: '', paidAt: today(), method: 'cash', notes: '' };

export default function PaymentsPage() {
  const dispatch = useAppDispatch();
  const { data: payments, loading } = useAppSelector((s) => s.payments);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchPayments({ ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }));
  }, [dispatch, startDate, endDate]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.orderId || !form.amount) return setError('Order ID and amount are required');
    setSaving(true);
    setError(null);
    const result = await dispatch(createPayment({
      orderId: Number(form.orderId),
      amount: Number(form.amount),
      paidAt: form.paidAt,
      method: form.method,
      notes: form.notes.trim() || null,
    }));
    setSaving(false);
    if (createPayment.fulfilled.match(result)) {
      setForm(EMPTY_FORM);
    } else {
      setError(result.error?.message || 'Failed to record payment.');
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        DPS (direct patient) collections. The quicker way to log one is the "Add payment" action on the order itself in Orders — use this when you're reconciling after the fact and know the order ID.
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-500 mb-1">Order ID</label>
          <input
            type="number"
            value={form.orderId}
            onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
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
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={form.paidAt}
            onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
            max={today()}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
          <select
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
        <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Payment'}</Button>
      </form>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No payments recorded yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{formatDate(p.paid_at)}</td>
                  <td className="px-4 py-2 text-gray-500">#{p.order_id}</td>
                  <td className="px-4 py-2">{p.channel === 'ils' ? p.patient_name : p.customer_name}</td>
                  <td className="px-4 py-2 font-medium">₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-gray-500">{METHOD_LABEL[p.method]}</td>
                  <td className="px-4 py-2 text-gray-400">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
