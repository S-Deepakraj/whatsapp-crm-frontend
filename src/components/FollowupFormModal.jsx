import { useEffect, useState } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { addFollowup } from '../store/followupSlice';
import api from '../services/api';
import { Button } from './ui/button';

const TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'review_request', label: 'Review Request' },
];

export default function FollowupFormModal({ customerId, customerName, onClose, onCreated }) {
  const dispatch = useAppDispatch();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: customerId ?? '',
    type: 'call',
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load customer list only when no customer is pre-selected
  useEffect(() => {
    if (!customerId) {
      api.get('/customers').then((r) => setCustomers(r.data));
    }
  }, [customerId]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await dispatch(addFollowup({
      customerId: Number(form.customerId),
      type: form.type,
      dueDate: form.dueDate,
    }));
    setLoading(false);
    if (addFollowup.fulfilled.match(result)) {
      onCreated?.();
      onClose();
    } else {
      setError(result.error?.message || 'Failed to create follow-up');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Add Follow-Up</h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer — shown only when not pre-selected */}
          {!customerId ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                name="customerId"
                value={form.customerId}
                onChange={handleChange}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Customer: <strong>{customerName}</strong></p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving…' : 'Add Follow-Up'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
