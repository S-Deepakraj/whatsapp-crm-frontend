import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTests } from '../store/testCatalogSlice';
import { fetchPartnerLabs } from '../store/partnerLabSlice';
import { createSelfCollectedOrder } from '../store/orderSlice';
import { useDebounce } from '../hooks/useDebounce';
import api from '../services/api';
import { Button } from './ui/button';

// Deliberately its own component, not a stripped-down copy of
// OrderFormModal — no price/rate field exists anywhere here, by
// construction, not by hiding one.
export default function SelfCollectedOrderModal({ onClose, onCreated }) {
  const dispatch = useAppDispatch();
  const tests = useAppSelector((s) => s.testCatalog.data);
  const partnerLabs = useAppSelector((s) => s.partnerLabs.data);

  const [channel, setChannel] = useState('walk_in');
  const [testCatalogIds, setTestCatalogIds] = useState([]);
  const [testQuery, setTestQuery] = useState('');

  // walk-in customer: phone-search-then-quick-add
  const [phoneQuery, setPhoneQuery] = useState('');
  const debouncedPhone = useDebounce(phoneQuery, 300);
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [checkedPhone, setCheckedPhone] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // ils
  const [partnerLabId, setPartnerLabId] = useState('');
  const [patientName, setPatientName] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);
  useEffect(() => { dispatch(fetchPartnerLabs()); }, [dispatch]);

  useEffect(() => {
    setFoundCustomer(null);
    setCheckedPhone(false);
    if (!debouncedPhone.trim()) return;
    api.get('/customers/check-phone', { params: { phone: debouncedPhone } }).then((r) => {
      setFoundCustomer(r.data[0] || null);
      setCheckedPhone(true);
    });
  }, [debouncedPhone]);

  function toggleTest(id) {
    setTestCatalogIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filteredTests = testQuery.trim()
    ? tests.filter((t) => t.name.toLowerCase().includes(testQuery.trim().toLowerCase()))
    : tests;
  const selectedTests = tests.filter((t) => testCatalogIds.includes(t.id));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (testCatalogIds.length === 0) return setError('Pick at least one test');

    const payload = { channel, testCatalogIds };
    if (channel === 'walk_in') {
      if (foundCustomer) {
        payload.customerId = foundCustomer.id;
      } else {
        if (!phoneQuery.trim() || !newCustomerName.trim()) return setError('Enter the patient\'s name and phone number');
        payload.newCustomer = { name: newCustomerName.trim(), phone: phoneQuery.trim() };
      }
    } else {
      if (!partnerLabId) return setError('Pick a partner lab');
      if (!patientName.trim()) return setError('Enter the patient name');
      payload.partnerLabId = Number(partnerLabId);
      payload.patientName = patientName.trim();
    }

    setSaving(true);
    const result = await dispatch(createSelfCollectedOrder(payload));
    setSaving(false);
    if (createSelfCollectedOrder.fulfilled.match(result)) {
      onCreated?.();
      onClose();
    } else {
      setError(result.error?.message || 'Failed to create order.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Add Order</h2>

        <div className="flex gap-1 mb-4">
          <Button type="button" variant={channel === 'walk_in' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('walk_in')}>Walk-in</Button>
          <Button type="button" variant={channel === 'ils' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('ils')}>ILS (Partner Lab)</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {channel === 'walk_in' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Patient phone</label>
              <input
                type="tel"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                placeholder="9876543210"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              {checkedPhone && phoneQuery.trim() && (
                foundCustomer ? (
                  <p className="text-xs text-green-700 mt-1">Existing patient: {foundCustomer.name}</p>
                ) : (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Patient name (new)</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Partner Lab</label>
                <select
                  value={partnerLabId}
                  onChange={(e) => setPartnerLabId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Select a lab</option>
                  {partnerLabs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Patient name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tests</label>

            {selectedTests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTests.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                    {t.name}
                    <button type="button" onClick={() => toggleTest(t.id)} className="text-green-500 hover:text-green-800 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Search tests…"
              className="w-full border rounded px-3 py-2 text-sm mb-2"
            />

            <div className="border rounded max-h-48 overflow-y-auto divide-y">
              {filteredTests.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-3 text-center">No tests match.</p>
              ) : filteredTests.map((t) => (
                <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={testCatalogIds.includes(t.id)}
                    onChange={() => toggleTest(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Order'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
