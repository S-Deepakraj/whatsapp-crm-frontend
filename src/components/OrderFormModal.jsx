import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createOrder, updateOrder } from '../store/orderSlice';
import { createCustomer, updateCustomer } from '../store/customerSlice';
import { fetchTests } from '../store/testCatalogSlice';
import { fetchPartnerLabs, fetchPartnerLabRates } from '../store/partnerLabSlice';
import { fetchOutsourceTests } from '../store/outsourceSlice';
import { useDebounce } from '../hooks/useDebounce';
import api from '../services/api';
import { Button } from './ui/button';

const SLOT_PRESETS = [
  { label: 'Morning',   start: '06:30', end: '06:45' },
  { label: 'Afternoon', start: '13:00', end: '13:30' },
  { label: 'Evening',   start: '17:00', end: '17:30' },
];

const EMPTY_LINE = { testCatalogId: '', testLabel: '', query: '', agreedPrice: '' };

// A test sent to an outsource lab. The lab is chosen per line, here on
// the order — the same test can go to Lab X on one order and Lab Y on
// the next (see migration 035).
const EMPTY_OUT_LINE = { outsourceTestId: '', testLabel: '', query: '', outsourceLabId: '', agreedPrice: '' };

function isBlankLine(l) {
  return !l.testCatalogId && l.agreedPrice === '' && !l.query.trim();
}

// Flattens the order's per-lab outsource orders back into form rows.
function outLinesFromOrder(order) {
  return (order?.outsource_orders ?? []).flatMap((oo) => oo.lines.map((l) => ({
    outsourceTestId: l.outsourceTestId,
    testLabel: l.testName,
    query: '',
    outsourceLabId: String(oo.outsourceLabId),
    outsourceLabName: oo.outsourceLabName,
    agreedPrice: l.agreedPrice != null ? String(l.agreedPrice) : '',
  })));
}

function toOutsourcePayload(outLines) {
  return outLines.map((l) => ({
    outsourceTestId: Number(l.outsourceTestId),
    outsourceLabId: Number(l.outsourceLabId),
    agreedPrice: parseFloat(l.agreedPrice),
  }));
}

const CATEGORY_LABEL = { test: 'Test', profile: 'Profile', package: 'Package', outlab: 'Outlab' };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function OrderFormModal({ order, onClose, onCreated }) {
  const dispatch = useAppDispatch();
  const tests = useAppSelector((s) => s.testCatalog.data);
  const partnerLabs = useAppSelector((s) => s.partnerLabs.data);
  const outsourceTests = useAppSelector((s) => s.outsource.tests);
  const outsourceTestsLoaded = useAppSelector((s) => s.outsource.testsLoaded);
  const isEdit = !!order;

  const [phoneQuery, setPhoneQuery] = useState('');
  const debouncedPhone = useDebounce(phoneQuery, 300);
  const [matches, setMatches] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  const [channel, setChannel] = useState(order?.channel || 'home_collection');
  const isWalkIn = channel === 'walk_in';
  const isIls = channel === 'ils';
  const isHomeCollection = channel === 'home_collection';
  // Once a sample's been collected, the address/slot are history — editing
  // stays open for tests/notes/patient name, matching the backend guard.
  const canEditAddressSlot = isHomeCollection && (!isEdit || ['confirmed', 'assigned'].includes(order.status));

  const [partnerLabId, setPartnerLabId] = useState(order?.partner_lab_id ? String(order.partner_lab_id) : '');
  const [patientName, setPatientName] = useState(order?.patient_name || '');
  const [labRates, setLabRates] = useState({});

  // Editing the customer's own name/phone from here updates the customer
  // record itself, not the order — same person, so no separate "patient
  // name" field to keep in sync like ILS orders have.
  const [customerName, setCustomerName] = useState(order?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone || '');

  const [collectionAddress, setCollectionAddress] = useState(order?.collection_address || '');
  const [scheduledDate, setScheduledDate] = useState(order?.scheduled_date?.slice(0, 10) || tomorrow());
  // order.slot_start/slot_end come back as "HH:mm:ss" (Postgres TIME) —
  // trim to "HH:mm" to match what the backend's time validation expects,
  // otherwise an untouched pre-filled value fails validation on save.
  const [slotStart, setSlotStart] = useState(order?.slot_start?.slice(0, 5) || SLOT_PRESETS[0].start);
  const [slotEnd, setSlotEnd] = useState(order?.slot_end?.slice(0, 5) || SLOT_PRESETS[0].end);
  const [notes, setNotes] = useState(order?.notes || '');
  const [lines, setLines] = useState(
    order?.test_lines?.length
      // agreedPrice is null for a technician-created order awaiting
      // pricing — String(null) would render the literal text "null" in
      // the input, so that case is left blank instead.
      ? order.test_lines.map((l) => ({ testCatalogId: l.testCatalogId, testLabel: l.testName, query: '', agreedPrice: l.agreedPrice != null ? String(l.agreedPrice) : '' }))
      // An outsource-only order has no processing-lab lines to show.
      : (order?.outsource_orders?.length ? [] : [{ ...EMPTY_LINE }])
  );
  const [outLines, setOutLines] = useState(() => outLinesFromOrder(order));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);
  useEffect(() => { dispatch(fetchPartnerLabs()); }, [dispatch]);
  useEffect(() => {
    if (!outsourceTestsLoaded) dispatch(fetchOutsourceTests({ includeInactive: true }));
  }, [dispatch, outsourceTestsLoaded]);

  // Prefill agreed price from this lab's negotiated rate when picking a
  // test on an ILS order — left blank (not MRP) if the lab hasn't been
  // priced for that test yet, so nobody accidentally bills them at MRP.
  // Editing an ILS order and switching lab: the old lab's prices don't
  // carry over, so every line is re-filled from the new lab's rates (blank
  // where it has none). Switching back restores the order's own prices.
  const labChanged = isEdit && isIls && partnerLabId !== String(order.partner_lab_id);

  useEffect(() => {
    if (!isIls || !partnerLabId) { setLabRates({}); return; }
    dispatch(fetchPartnerLabRates(Number(partnerLabId))).then((result) => {
      if (fetchPartnerLabRates.fulfilled.match(result)) {
        const map = {};
        result.payload.forEach((r) => { if (r.rate != null) map[r.test_catalog_id] = r.rate; });
        setLabRates(map);
        if (isEdit) {
          const backToOriginal = partnerLabId === String(order.partner_lab_id);
          setLines((prev) => prev.map((line) => {
            if (!line.testCatalogId) return line;
            const original = backToOriginal
              ? order.test_lines.find((l) => l.testCatalogId === Number(line.testCatalogId))?.agreedPrice
              : null;
            const price = original ?? map[line.testCatalogId];
            return { ...line, agreedPrice: price != null ? String(price) : '' };
          }));
        }
      }
    });
  }, [dispatch, isIls, partnerLabId]);

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
    setAddingNew(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setPhoneQuery('');
    setNewCustomerName('');
    setAddingNew(false);
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
      const prefill = isIls
        ? (labRates[test.id] != null ? String(labRates[test.id]) : '')
        : (test.mrp != null ? String(test.mrp) : '');
      return {
        ...line,
        testCatalogId: test.id,
        testLabel: test.name,
        query: '',
        agreedPrice: line.agreedPrice || prefill,
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

  function addOutLine() {
    setOutLines((prev) => [...prev, { ...EMPTY_OUT_LINE }]);
  }

  function removeOutLine(i) {
    setOutLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateOutLine(i, field, value) {
    setOutLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));
  }

  // A test only one lab offers has nothing to decide, so that lab is
  // filled in; with several, the lab is left for the owner to pick.
  function pickOutTest(i, test) {
    setOutLines((prev) => prev.map((line, idx) => {
      if (idx !== i) return line;
      return {
        ...line,
        outsourceTestId: test.id,
        testLabel: test.name,
        query: '',
        outsourceLabId: test.labs.length === 1 ? String(test.labs[0].outsourceLabId) : '',
        agreedPrice: line.agreedPrice || (test.suggested_price != null ? String(test.suggested_price) : ''),
      };
    }));
  }

  function clearOutLineTest(i) {
    setOutLines((prev) => prev.map((line, idx) => (idx === i ? { ...EMPTY_OUT_LINE, agreedPrice: line.agreedPrice } : line)));
  }

  function outMatchesFor(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return outsourceTests
      .filter((t) => t.active && (t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q)))
      .slice(0, 8);
  }

  function labOptionsFor(line) {
    const test = outsourceTests.find((t) => t.id === Number(line.outsourceTestId));
    const options = test?.labs ?? [];
    // Editing an old order whose lab has since stopped offering the test:
    // keep that lab visible as the current choice rather than blanking it.
    if (line.outsourceLabId && !options.some((o) => String(o.outsourceLabId) === line.outsourceLabId)) {
      return [{ outsourceLabId: Number(line.outsourceLabId), outsourceLabName: `${line.outsourceLabName ?? 'Current lab'} (no longer offered)`, cost: null }, ...options];
    }
    return options;
  }

  const filledLines = lines.filter((l) => !isBlankLine(l));
  const processingTotal = filledLines.reduce((sum, l) => sum + (parseFloat(l.agreedPrice) || 0), 0);
  const outsourceTotal = outLines.reduce((sum, l) => sum + (parseFloat(l.agreedPrice) || 0), 0);
  const total = processingTotal + outsourceTotal;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!isEdit && !isIls && !selectedCustomer && !(phoneQuery.trim() && newCustomerName.trim())) {
      setError('Select an existing customer or enter a name and phone for a new one.');
      return;
    }
    if (!isEdit && isIls && !partnerLabId) {
      setError('Select a partner lab.');
      return;
    }
    if (isIls && !patientName.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (isEdit && !isIls && (!customerName.trim() || !customerPhone.trim())) {
      setError('Customer name and phone are required.');
      return;
    }
    if (canEditAddressSlot && !collectionAddress.trim()) {
      setError('Collection address is required.');
      return;
    }
    if (canEditAddressSlot && slotEnd <= slotStart) {
      setError('End time must be after start time.');
      return;
    }
    // A fully blank processing-lab row is just the empty starter row —
    // ignored, so an order can be outsourced tests only.
    if (filledLines.some((l) => !l.testCatalogId || l.agreedPrice === '')) {
      setError('Fill in a test and agreed price for every line.');
      return;
    }
    if (outLines.some((l) => !l.outsourceTestId || !l.outsourceLabId || l.agreedPrice === '')) {
      setError('Pick a test, a lab and a patient rate for every outsourced test.');
      return;
    }
    if (filledLines.length === 0 && outLines.length === 0) {
      setError('Add at least one test.');
      return;
    }

    setLoading(true);
    try {
      const testLines = filledLines.map((l) => ({
        testCatalogId: Number(l.testCatalogId),
        agreedPrice: parseFloat(l.agreedPrice),
      }));
      const outsourceLines = toOutsourcePayload(outLines);
      // Re-sent on edit only when changed — the server re-checks every
      // line's lab still offers its test, which an untouched old order
      // shouldn't have to pass just to fix a typo in its notes.
      const outsourceChanged = !isEdit
        || JSON.stringify(outsourceLines) !== JSON.stringify(toOutsourcePayload(outLinesFromOrder(order)));

      if (isEdit) {
        if (!isIls && (customerName.trim() !== order.customer_name || customerPhone.trim() !== order.customer_phone)) {
          const customerResult = await dispatch(updateCustomer({
            id: order.customer_id,
            name: customerName.trim(),
            phone: customerPhone.trim(),
          }));
          if (!updateCustomer.fulfilled.match(customerResult)) {
            setError(customerResult.error?.message || 'Failed to update customer.');
            setLoading(false);
            return;
          }
        }

        const result = await dispatch(updateOrder({
          id: order.id,
          scheduledDate,
          notes: notes || null,
          testLines,
          ...(outsourceChanged ? { outsourceLines } : {}),
          ...(isIls ? { patientName: patientName.trim() } : {}),
          ...(labChanged ? { partnerLabId: Number(partnerLabId) } : {}),
          ...(canEditAddressSlot ? {
            collectionAddress: collectionAddress.trim(),
            slotStart,
            slotEnd,
          } : {}),
        }));

        if (updateOrder.fulfilled.match(result)) {
          onCreated?.();
          onClose();
        } else {
          setError(result.error?.message || 'Failed to update order.');
        }
        return;
      }

      if (isIls) {
        const result = await dispatch(createOrder({
          channel,
          partnerLabId: Number(partnerLabId),
          patientName: patientName.trim(),
          scheduledDate,
          notes: notes || null,
          testLines,
          outsourceLines,
        }));

        if (createOrder.fulfilled.match(result)) {
          onCreated?.();
          onClose();
        } else {
          setError(result.error?.message || 'Failed to create order.');
        }
        return;
      }

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
        channel,
        scheduledDate,
        notes: notes || null,
        testLines,
        outsourceLines,
        ...(isHomeCollection ? {
          collectionAddress: collectionAddress.trim(),
          slotStart,
          slotEnd,
        } : {}),
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
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Order' : isWalkIn ? 'New Walk-in Order' : isIls ? 'New ILS Order' : 'New Home Collection Order'}
          </h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Channel */}
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isHomeCollection ? 'default' : 'outline'}
                    onClick={() => { setChannel('home_collection'); setScheduledDate((d) => (d === today() ? tomorrow() : d)); }}
                    className="flex-1"
                  >
                    Home Collection
                  </Button>
                  <Button
                    type="button"
                    variant={isWalkIn ? 'default' : 'outline'}
                    onClick={() => { setChannel('walk_in'); setScheduledDate((d) => (d === tomorrow() ? today() : d)); }}
                    className="flex-1"
                  >
                    Walk-in
                  </Button>
                  <Button
                    type="button"
                    variant={isIls ? 'default' : 'outline'}
                    onClick={() => { setChannel('ils'); setScheduledDate((d) => (d === tomorrow() ? today() : d)); }}
                    className="flex-1"
                  >
                    Partner Lab
                  </Button>
                </div>
              </div>
            )}

            {/* Customer / Patient */}
            {isEdit ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isIls ? 'Patient' : 'Customer'}</label>
                {isIls ? (
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-36 border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {isIls && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partner lab</label>
                    <select
                      value={partnerLabId}
                      onChange={(e) => setPartnerLabId(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      {/* An inactive lab is missing from the list — keep it selectable as the current value. */}
                      {!partnerLabs.some((l) => String(l.id) === String(order.partner_lab_id)) && (
                        <option value={String(order.partner_lab_id)}>{order.partner_lab_name}</option>
                      )}
                      {partnerLabs.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    {labChanged && (
                      <p className="text-xs text-amber-600 mt-1">Prices below were re-filled from {partnerLabs.find((l) => String(l.id) === partnerLabId)?.name ?? 'the new lab'}'s rates — check them before saving.</p>
                    )}
                  </div>
                )}
                {!isIls && (
                  <p className="text-xs text-gray-400 mt-1">Editing here updates this customer's profile everywhere, not just this order.</p>
                )}
              </div>
            ) : isIls ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner lab</label>
                  <select
                    value={partnerLabId}
                    onChange={(e) => setPartnerLabId(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select a partner lab…</option>
                    {partnerLabs.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Full name"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer phone</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50">
                  <span>{selectedCustomer.name} — {selectedCustomer.phone}</span>
                  <Button type="button" variant="link" size="xs" onClick={clearCustomer} className="text-gray-400 hover:text-red-500">Change</Button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={phoneQuery}
                    onChange={(e) => { setPhoneQuery(e.target.value); setAddingNew(false); }}
                    placeholder="Search by phone or name…"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  {matches.length > 0 && !addingNew && (
                    <>
                      <ul className="border rounded mt-1 divide-y text-sm">
                        {matches.map((c) => (
                          <li key={c.id}>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => pickCustomer(c)}
                              className="w-full justify-start rounded-none h-auto px-3 py-2 font-normal"
                            >
                              {c.name} — {c.phone}
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() => setAddingNew(true)}
                        className="text-green-600 hover:text-green-700 mt-1"
                      >
                        + Not one of these — new patient with this number
                      </Button>
                    </>
                  )}
                  {phoneQuery.trim() && (matches.length === 0 || addingNew) && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        {matches.length === 0 ? 'No match — new customer name' : 'New patient name'}
                      </label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Full name"
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                      {matches.length > 0 && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => setAddingNew(false)}
                          className="text-gray-400 mt-1"
                        >
                          ← Back to matches
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            )}

            {isHomeCollection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection address</label>
                {canEditAddressSlot ? (
                  <textarea
                    rows={2}
                    value={collectionAddress}
                    onChange={(e) => setCollectionAddress(e.target.value)}
                    placeholder="House/flat, street, landmark…"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="border rounded px-3 py-2 text-sm bg-gray-50 text-gray-600">
                    {collectionAddress || '—'}
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isHomeCollection ? 'Date' : isWalkIn ? 'Collection date' : 'Date received'}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            {isHomeCollection && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Collection window</label>
                  {canEditAddressSlot && (
                    <div className="flex gap-1">
                      {SLOT_PRESETS.map((p) => (
                        <Button
                          key={p.label}
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => { setSlotStart(p.start); setSlotEnd(p.end); }}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {canEditAddressSlot ? (
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
                ) : (
                  <div className="border rounded px-3 py-2 text-sm bg-gray-50 text-gray-600">
                    {slotStart} – {slotEnd}
                  </div>
                )}
              </div>
            )}

            {/* Tests */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Tests</label>
                <Button type="button" variant="link" size="xs" onClick={addLine} className="text-green-600 hover:text-green-700">
                  + Add test
                </Button>
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
                              <Button type="button" variant="link" size="xs" onClick={() => clearLineTest(i)} className="text-gray-400 hover:text-red-500">Change</Button>
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
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => pickTest(i, t)}
                                    className="w-full h-auto justify-between rounded-none px-3 py-2 font-normal"
                                  >
                                    <span>
                                      {t.name}
                                      {t.test_code ? <span className="text-gray-400"> · {t.test_code}</span> : null}
                                    </span>
                                    <span className="text-xs text-gray-400 shrink-0">
                                      {isIls
                                        ? (labRates[t.id] != null ? `Lab rate ₹${labRates[t.id]}` : 'No rate set')
                                        : `${CATEGORY_LABEL[t.category] ?? t.category}${t.mrp != null ? ` · MRP ₹${t.mrp}` : ''}`}
                                    </span>
                                  </Button>
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
                        {(lines.length > 1 || outLines.length > 0) && (
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outsourced tests — sent to another lab, chosen per test */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Outsourced tests <span className="font-normal text-gray-400">(sent to another lab)</span>
                </label>
                <Button type="button" variant="link" size="xs" onClick={addOutLine} className="text-green-600 hover:text-green-700">
                  + Add outsourced test
                </Button>
              </div>
              {outLines.length > 0 && outsourceTestsLoaded && !outsourceTests.some((t) => t.active) && (
                <p className="text-xs text-amber-600 mb-2">
                  No outsourced tests set up yet — add them under Outsourcing → Tests, and each lab's rates under Outsourcing → Labs.
                </p>
              )}
              <div className="space-y-3">
                {outLines.map((line, i) => {
                  const suggestions = line.outsourceTestId ? [] : outMatchesFor(line.query);
                  const labOptions = line.outsourceTestId ? labOptionsFor(line) : [];
                  const chosen = labOptions.find((o) => String(o.outsourceLabId) === line.outsourceLabId);
                  const margin = chosen?.cost != null && line.agreedPrice !== '' ? parseFloat(line.agreedPrice) - chosen.cost : null;
                  return (
                    <div key={i} className="border rounded-lg p-2 bg-gray-50/60">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          {line.outsourceTestId ? (
                            <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-white">
                              <span>{line.testLabel}</span>
                              <Button type="button" variant="link" size="xs" onClick={() => clearOutLineTest(i)} className="text-gray-400 hover:text-red-500">Change</Button>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={line.query}
                              onChange={(e) => updateOutLine(i, 'query', e.target.value)}
                              placeholder="Search outsourced test…"
                              className="w-full border rounded px-3 py-2 text-sm bg-white"
                            />
                          )}
                          {suggestions.length > 0 && (
                            <ul className="absolute z-10 left-0 right-0 bg-white border rounded mt-1 divide-y text-sm shadow-lg max-h-56 overflow-y-auto">
                              {suggestions.map((t) => (
                                <li key={t.id}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => pickOutTest(i, t)}
                                    className="w-full h-auto justify-between rounded-none px-3 py-2 font-normal"
                                  >
                                    <span>
                                      {t.name}
                                      {t.test_code ? <span className="text-gray-400"> · {t.test_code}</span> : null}
                                    </span>
                                    <span className="text-xs text-gray-400 shrink-0">
                                      {t.labs.length ? `${t.labs.length} lab${t.labs.length > 1 ? 's' : ''}` : 'No lab offers this'}
                                    </span>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <input
                          type="number" min="0" step="0.01"
                          placeholder="₹ patient"
                          value={line.agreedPrice}
                          onChange={(e) => updateOutLine(i, 'agreedPrice', e.target.value)}
                          className="w-28 border rounded px-3 py-2 text-sm bg-white"
                        />
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeOutLine(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</Button>
                      </div>
                      {line.outsourceTestId && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 shrink-0">Send to</span>
                          {labOptions.length === 0 ? (
                            <span className="text-xs text-amber-600">No lab offers this test yet — set a rate under Outsourcing → Labs.</span>
                          ) : (
                            <select
                              value={line.outsourceLabId}
                              onChange={(e) => updateOutLine(i, 'outsourceLabId', e.target.value)}
                              className={`flex-1 border rounded px-2 py-1.5 text-sm bg-white ${!line.outsourceLabId ? 'border-amber-400' : ''}`}
                            >
                              <option value="">Choose a lab…</option>
                              {labOptions.map((o) => (
                                <option key={o.outsourceLabId} value={o.outsourceLabId}>
                                  {o.outsourceLabName}{o.cost != null ? ` — cost ₹${Number(o.cost).toLocaleString('en-IN')}` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                          {margin != null && (
                            <span className={`text-xs shrink-0 ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              Margin ₹{margin.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {total > 0 && (
                <p className="text-right text-sm font-semibold text-green-700 mt-2">
                  Total agreed: ₹{total.toLocaleString('en-IN')}
                  {outsourceTotal > 0 && processingTotal > 0 && (
                    <span className="block text-xs font-normal text-gray-500">
                      ₹{processingTotal.toLocaleString('en-IN')} tests + ₹{outsourceTotal.toLocaleString('en-IN')} outsourced
                    </span>
                  )}
                </p>
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : isWalkIn ? 'Register Walk-in' : isIls ? 'Create ILS Order' : 'Confirm Order'}
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
