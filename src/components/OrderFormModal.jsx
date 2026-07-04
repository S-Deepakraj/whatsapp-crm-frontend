import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createOrder } from '../store/orderSlice';
import { createCustomer } from '../store/customerSlice';
import { fetchTests } from '../store/testCatalogSlice';
import { useDebounce } from '../hooks/useDebounce';
import api from '../services/api';

const SLOT_PRESETS = [
  { label: 'Morning',   start: '06:30', end: '06:45' },
  { label: 'Afternoon', start: '13:00', end: '13:30' },
  { label: 'Evening',   start: '17:00', end: '17:30' },
];

const EMPTY_LINE = { testCatalogId: '', testLabel: '', query: '', agreedPrice: '' };

const CATEGORY_LABEL = { test: 'Test', profile: 'Profile', package: 'Package', outlab: 'Outlab' };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function OrderFormModal({ onClose, onCreated }) {
  const dispatch = useAppDispatch();
  const tests = useAppSelector((s) => s.testCatalog.data);

  const [phoneQuery, setPhoneQuery] = useState('');
  const debouncedPhone = useDebounce(phoneQuery, 300);
  const [matches, setMatches] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [collectionAddress, setCollectionAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState(tomorrow());
  const [slotStart, setSlotStart] = useState(SLOT_PRESETS[0].start);
  const [slotEnd, setSlotEnd] = useState(SLOT_PRESETS[0].end);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);

  useEffect(() => {
    if (selectedCustomer || !debouncedPhone.trim()) { setMatches([]); return; }
    api.get('/customers', { params: { search: debouncedPhone } }).then((r) => {
      const data = Array.isArray(r.data) ? r.data : r.data.data;
      setMatches(data.slice(0, 5));
    });
  }, [debouncedPhone, selectedCustomer]);

  function pickCustomer(c) {
    setSelectedCustomer(c);
    setMatches([]);
    setPhoneQuery(c.phone);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setPhoneQuery('');
    setNewCustomerName('');
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

function updateLine(i, field, value) {
    setLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));
  }

  function pickTest(i, test) {
    setLines((prev) => prev.map((line, idx) => {
      if (idx !== i) return line;
      return {
        ...line,
        testCatalogId: test.id,
        testLabel: test.name,
        query: '',
        agreedPrice: line.agreedPrice || (test.mrp != null ? String(test.mrp) : ''),
      };
    }));
  }

  function clearLineTest(i) {
    setLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, testCatalogId: '', testLabel: '', query: '' } : line)));
  }

  function matchesFor(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tests
      .filter((t) => t.active && (t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q)))
      .slice(0, 8);
  }

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.agreedPrice) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!selectedCustomer && !(phoneQuery.trim() && newCustomerName.trim())) {
      setError('Select an existing customer or enter a name and phone for a new one.');
      return;
    }
    if (!collectionAddress.trim()) {
      setError('Collection address is required.');
      return;
    }
    if (slotEnd <= slotStart) {
      setError('End time must be after start time.');
      return;
    }
    if (lines.some((l) => !l.testCatalogId || l.agreedPrice === '')) {
      setError('Fill in a test and agreed price for every line.');
      return;
    }

    setLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      if (!customerId) {
        const result = await dispatch(createCustomer({ name: newCustomerName.trim(), phone: phoneQuery.trim() }));
        if (!createCustomer.fulfilled.match(result)) {
          setError(result.error?.message || 'Failed to create customer.');
          setLoading(false);
          return;
        }
        customerId = result.payload.id;
      }

      const result = await dispatch(createOrder({
        customerId,
        collectionAddress: collectionAddress.trim(),
        scheduledDate,
        slotStart,
        slotEnd,
        notes: notes || null,
        testLines: lines.map((l) => ({
          testCatalogId: Number(l.testCatalogId),
          agreedPrice: parseFloat(l.agreedPrice),
        })),
      }));

      if (createOrder.fulfilled.match(result)) {
        onCreated?.();
        onClose();
      } else {
        setError(result.error?.message || 'Failed to create order.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Home Collection Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer phone</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50">
                  <span>{selectedCustomer.name} — {selectedCustomer.phone}</span>
                  <button type="button" onClick={clearCustomer} className="text-xs text-gray-400 hover:text-red-500">Change</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={phoneQuery}
                    onChange={(e) => setPhoneQuery(e.target.value)}
                    placeholder="Search by phone or name…"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  {matches.length > 0 && (
                    <ul className="border rounded mt-1 divide-y text-sm">
                      {matches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => pickCustomer(c)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          >
                            {c.name} — {c.phone}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {phoneQuery.trim() && matches.length === 0 && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">No match — new customer name</label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Full name"
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection address</label>
              <textarea
                rows={2}
                value={collectionAddress}
                onChange={(e) => setCollectionAddress(e.target.value)}
                placeholder="House/flat, street, landmark…"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Date / slot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Collection window</label>
                <div className="flex gap-1">
                  {SLOT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setSlotStart(p.start); setSlotEnd(p.end); }}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="time"
                  step="900"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  step="900"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Tests */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Tests</label>
                <button type="button" onClick={addLine} className="text-xs text-green-600 hover:text-green-700 font-medium">
                  + Add test
                </button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => {
                  const suggestions = line.testCatalogId ? [] : matchesFor(line.query);
                  return (
                    <div key={i}>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          {line.testCatalogId ? (
                            <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50">
                              <span>{line.testLabel}</span>
                              <button type="button" onClick={() => clearLineTest(i)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={line.query}
                              onChange={(e) => updateLine(i, 'query', e.target.value)}
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
                          type="number" min="0" step="0.01"
                          placeholder="₹ agreed"
                          value={line.agreedPrice}
                          onChange={(e) => updateLine(i, 'agreedPrice', e.target.value)}
                          className="w-28 border rounded px-3 py-2 text-sm"
                        />
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 px-1 text-lg leading-none">×</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {total > 0 && (
                <p className="text-right text-sm font-semibold text-green-700 mt-2">Total agreed: ₹{total.toLocaleString('en-IN')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fasting required, call before arriving…"
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
              {loading ? 'Saving…' : 'Confirm Order'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border py-2 rounded hover:bg-gray-50 text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
