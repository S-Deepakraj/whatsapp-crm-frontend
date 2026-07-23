import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createVisit } from '../store/visitSlice';
import { fetchTests } from '../store/testCatalogSlice';

const EMPTY_ITEM = { testCatalogId: '', serviceName: '', query: '', amount: '' };

const CATEGORY_LABEL = { test: 'Test', profile: 'Profile', package: 'Package', outlab: 'Outlab' };

export default function VisitFormModal({ customerId, onClose, onCreated }) {
  const dispatch = useAppDispatch();
  const tests = useAppSelector((s) => s.testCatalog.data);

  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]         = useState('');
  const [items, setItems]         = useState([{ ...EMPTY_ITEM }]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function pickTest(i, test) {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      return {
        ...item,
        testCatalogId: test.id,
        serviceName: test.name,
        query: '',
        amount: item.amount || (test.mrp != null ? String(test.mrp) : ''),
      };
    }));
  }

  function clearItemTest(i) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, testCatalogId: '', serviceName: '', query: '' } : item)));
  }

  function matchesFor(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tests
      .filter((t) => t.active && (t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q)))
      .slice(0, 8);
  }

  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.some((it) => !it.serviceName.trim() || !it.amount)) {
      setError('Pick a service and enter an amount for every line.');
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
                {items.map((item, i) => {
                  const suggestions = item.testCatalogId ? [] : matchesFor(item.query);
                  return (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 relative">
                        {item.testCatalogId ? (
                          <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50">
                            <span>{item.serviceName}</span>
                            <button type="button" onClick={() => clearItemTest(i)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={item.query}
                            onChange={(e) => updateItem(i, 'query', e.target.value)}
                            placeholder="Search test name or code…"
                            className="w-full border rounded px-3 py-2 text-sm"
                          />
                        )}
                        {suggestions.length > 0 && (
                          <ul className="absolute z-10 left-0 right-0 bg-white border rounded mt-1 divide-y text-sm shadow-lg max-h-56 overflow-y-auto">
                            {suggestions.map((t) => (
                              <li key={t.id}>
                                <button
                                  type="button"
                                  onClick={() => pickTest(i, t)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2"
                                >
                                  <span>
                                    {t.name}
                                    {t.test_code ? <span className="text-gray-400"> · {t.test_code}</span> : null}
                                  </span>
                                  <span className="text-xs text-gray-400 shrink-0">
                                    {CATEGORY_LABEL[t.category] ?? t.category}{t.mrp != null ? ` · MRP ₹${t.mrp}` : ''}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
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
                  );
                })}
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
