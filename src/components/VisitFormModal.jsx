import { useState } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { createVisit } from '../store/visitSlice';

const EMPTY_ITEM = { serviceName: '', amount: '' };

export default function VisitFormModal({ customerId, onClose, onCreated }) {
  const dispatch = useAppDispatch();

  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]         = useState('');
  const [items, setItems]         = useState([{ ...EMPTY_ITEM }]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.some((it) => !it.serviceName.trim() || !it.amount)) {
      setError('Fill in all service names and amounts.');
      return;
    }
    setLoading(true);
    setError(null);

    const result = await dispatch(createVisit({
      customerId,
      visitDate,
      notes: notes || null,
      items: items.map((it) => ({
        serviceName: it.serviceName.trim(),
        amount: parseFloat(it.amount),
      })),
    }));

    setLoading(false);
    if (createVisit.fulfilled.match(result)) {
      onCreated?.();
      onClose();
    } else {
      setError(result.error?.message || 'Failed to save visit.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log Visit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Services</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  + Add service
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Service name"
                      value={item.serviceName}
                      onChange={(e) => updateItem(i, 'serviceName', e.target.value)}
                      className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="₹"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateItem(i, 'amount', e.target.value)}
                      className="w-24 border rounded px-3 py-2 text-sm"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-400 hover:text-red-500 px-1 text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {total > 0 && (
                <p className="text-right text-sm font-semibold text-green-700 mt-2">
                  Total: ₹{total.toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this visit…"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Saving…' : 'Save Visit'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border py-2 rounded hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
