import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchOutsourceLabs, createOutsourceLab, updateOutsourceLab,
  fetchOutsourceTests, createOutsourceTest, updateOutsourceTest,
  fetchOutsourcePayables, fetchOutsourcePayments,
  fetchOutsourceOrders, updateOutsourceOrder,
} from '../store/outsourceSlice';
import OutsourcePaymentModal from '../components/OutsourcePaymentModal';
import Pagination from '../components/Pagination';
import { Button } from '../components/ui/button';

const PAGE_SIZE = 20;

function money(n) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Orders (records) ─────────────────────────────────────────

function OrdersTab() {
  const dispatch = useAppDispatch();
  const labs = useAppSelector((s) => s.outsource.labs);
  const { orders, ordersLoading } = useAppSelector((s) => s.outsource);
  const [labId, setLabId] = useState('');
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(today());
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchOutsourceOrders({
      outsourceLabId: labId || undefined,
      start: start || undefined,
      end: end || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }));
  }, [dispatch, labId, start, end, page]);

  function changeFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1); };
  }

  function saveSentDate(row, value) {
    dispatch(updateOutsourceOrder({ id: row.id, sentDate: value || null }));
  }

  const totalPages = Math.max(1, Math.ceil(orders.total / PAGE_SIZE));
  const pageCost = orders.data.reduce((s, o) => s + parseFloat(o.total_cost), 0);
  const pagePrice = orders.data.reduce((s, o) => s + parseFloat(o.total_price), 0);

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lab</label>
          <select value={labId} onChange={changeFilter(setLabId)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All labs</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={start} onChange={changeFilter(setStart)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={end} onChange={changeFilter(setEnd)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{orders.total} record{orders.total === 1 ? '' : 's'}</span>
      </div>

      {ordersLoading && orders.data.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : orders.data.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">
          No outsourced tests in this range. Add them from the "Outsourced tests" section of the order form.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Lab</th>
                <th className="px-4 py-2 font-medium">Tests</th>
                <th className="px-4 py-2 font-medium text-right">Patient Rate</th>
                <th className="px-4 py-2 font-medium text-right">Lab Cost</th>
                <th className="px-4 py-2 font-medium">Sent On</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id} className={`border-b last:border-0 ${o.order_status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(o.scheduled_date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{o.patient_name}</div>
                    <div className="text-xs text-gray-400">
                      Order #{o.order_id}{o.channel === 'ils' ? ' · ILS' : ''}{o.order_status === 'cancelled' ? ' · cancelled' : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2">{o.outsource_lab_name}</td>
                  <td className="px-4 py-2 text-gray-600">{o.tests.map((t) => t.testName).join(', ')}</td>
                  <td className="px-4 py-2 text-right">{money(o.total_price)}</td>
                  <td className="px-4 py-2 text-right">{money(o.total_cost)}</td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      defaultValue={o.sent_date ? o.sent_date.slice(0, 10) : ''}
                      onBlur={(e) => {
                        const current = o.sent_date ? o.sent_date.slice(0, 10) : '';
                        if (e.target.value !== current) saveSentDate(o, e.target.value);
                      }}
                      className="border rounded px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t text-gray-500">
                <td className="px-4 py-2 text-xs" colSpan={4}>This page</td>
                <td className="px-4 py-2 text-right font-medium">{money(pagePrice)}</td>
                <td className="px-4 py-2 text-right font-medium">{money(pageCost)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}

// ── Payables ─────────────────────────────────────────────────

const METHOD_LABELS = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', other: 'Other' };

function PayablesTab() {
  const dispatch = useAppDispatch();
  const { payables, payablesLoading } = useAppSelector((s) => s.outsource);
  const [payingLab, setPayingLab] = useState(null);
  const [expandedLabId, setExpandedLabId] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { dispatch(fetchOutsourcePayables()); }, [dispatch]);

  async function toggleHistory(labId) {
    if (expandedLabId === labId) return setExpandedLabId(null);
    setExpandedLabId(labId);
    setHistory([]);
    const result = await dispatch(fetchOutsourcePayments(labId));
    if (fetchOutsourcePayments.fulfilled.match(result)) setHistory(result.payload);
  }

  function refresh() {
    dispatch(fetchOutsourcePayables());
    if (expandedLabId) {
      dispatch(fetchOutsourcePayments(expandedLabId)).then((r) => {
        if (fetchOutsourcePayments.fulfilled.match(r)) setHistory(r.payload);
      });
    }
  }

  const totals = payables.reduce(
    (acc, p) => ({ owed: acc.owed + p.owed, paid: acc.paid + p.paid, balance: acc.balance + p.balance }),
    { owed: 0, paid: 0, balance: 0 }
  );

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Running balance per lab, all time: <strong>owed</strong> is the cost of every outsourced test on a
        non-cancelled order, <strong>paid</strong> is what you've recorded paying the lab.
      </p>

      {payablesLoading && payables.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : payables.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No outsource labs yet — add one under the Labs tab.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Lab</th>
                <th className="px-4 py-2 font-medium text-right">Orders</th>
                <th className="px-4 py-2 font-medium text-right">Tests</th>
                <th className="px-4 py-2 font-medium text-right">Owed</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payables.map((p) => (
                <PayableRow
                  key={p.outsourceLabId}
                  row={p}
                  expanded={expandedLabId === p.outsourceLabId}
                  history={history}
                  onToggle={() => toggleHistory(p.outsourceLabId)}
                  onPay={() => setPayingLab(p)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="px-4 py-2" colSpan={3}>Total</td>
                <td className="px-4 py-2 text-right">{money(totals.owed)}</td>
                <td className="px-4 py-2 text-right">{money(totals.paid)}</td>
                <td className={`px-4 py-2 text-right ${totals.balance > 0 ? 'text-red-600' : ''}`}>{money(totals.balance)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {payingLab && <OutsourcePaymentModal lab={payingLab} onClose={() => setPayingLab(null)} onSaved={refresh} />}
    </div>
  );
}

function PayableRow({ row, expanded, history, onToggle, onPay }) {
  return (
    <>
      <tr className={`border-b last:border-0 ${!row.active ? 'opacity-60' : ''}`}>
        <td className="px-4 py-2 font-medium">{row.outsourceLabName}</td>
        <td className="px-4 py-2 text-right">{row.orderCount}</td>
        <td className="px-4 py-2 text-right">{row.lineCount}</td>
        <td className="px-4 py-2 text-right">{money(row.owed)}</td>
        <td className="px-4 py-2 text-right">{money(row.paid)}</td>
        <td className={`px-4 py-2 text-right font-medium ${row.balance > 0 ? 'text-red-600' : row.balance < 0 ? 'text-amber-600' : 'text-green-600'}`}>
          {money(row.balance)}
        </td>
        <td className="px-4 py-2 text-right whitespace-nowrap">
          <Button variant="link" size="xs" onClick={onPay} className="text-green-600 mr-1">Record Payment</Button>
          <Button variant="link" size="xs" onClick={onToggle} className="text-gray-500">
            {expanded ? 'Hide' : 'History'}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-gray-50">
          <td colSpan={7} className="px-4 py-3">
            {history.length === 0 ? (
              <p className="text-xs text-gray-400">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <span className="w-24 text-gray-500">{formatDate(h.paid_at)}</span>
                    <span className="w-24 font-medium">{money(h.amount)}</span>
                    <span className="w-28 text-gray-500">{METHOD_LABELS[h.method] ?? h.method}</span>
                    <span className="text-gray-500">{[h.reference, h.notes].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Labs ─────────────────────────────────────────────────────

const EMPTY_LAB = { name: '', phone: '', contactPerson: '' };

function LabsTab() {
  const dispatch = useAppDispatch();
  const { labs, labsLoading } = useAppSelector((s) => s.outsource);
  const [form, setForm] = useState(EMPTY_LAB);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_LAB);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const result = await dispatch(createOutsourceLab({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      contactPerson: form.contactPerson.trim() || null,
    }));
    setSaving(false);
    if (createOutsourceLab.fulfilled.match(result)) setForm(EMPTY_LAB);
  }

  function startEdit(l) {
    setEditingId(l.id);
    setEditForm({ name: l.name, phone: l.phone ?? '', contactPerson: l.contact_person ?? '' });
  }

  async function saveEdit(id) {
    await dispatch(updateOutsourceLab({
      id,
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
      contactPerson: editForm.contactPerson.trim() || null,
    }));
    setEditingId(null);
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Lab name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Metropolis Salem"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact person <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.contactPerson}
            onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Lab'}</Button>
      </form>

      {labsLoading && labs.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : labs.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No outsource labs yet — add one above.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l) => (
                <tr key={l.id} className={`border-b last:border-0 ${!l.active ? 'opacity-50' : ''}`}>
                  {editingId === l.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.contactPerson} onChange={(e) => setEditForm((f) => ({ ...f, contactPerson: e.target.value }))} className="w-full border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className="w-full border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2 text-gray-400">{l.active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(l.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium">{l.name}</td>
                      <td className="px-4 py-2">{l.contact_person || '—'}</td>
                      <td className="px-4 py-2">{l.phone || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${l.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button asChild variant="link" size="xs" className="text-blue-600 mr-1">
                          <Link to={`/outsourcing/labs/${l.id}/rates`}>Manage Rates</Link>
                        </Button>
                        <Button variant="link" size="xs" onClick={() => startEdit(l)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => dispatch(updateOutsourceLab({ id: l.id, active: !l.active }))} className="text-gray-500">
                          {l.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tests ────────────────────────────────────────────────────

const EMPTY_TEST = { name: '', testCode: '', suggestedPrice: '' };

function TestsTab() {
  const dispatch = useAppDispatch();
  const { tests, testsLoading } = useAppSelector((s) => s.outsource);
  const [form, setForm] = useState(EMPTY_TEST);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_TEST);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchOutsourceTests({ includeInactive: true })); }, [dispatch]);

  function toPayload(f) {
    return {
      name: f.name.trim(),
      testCode: f.testCode.trim() || null,
      suggestedPrice: f.suggestedPrice === '' ? null : parseFloat(f.suggestedPrice),
    };
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const result = await dispatch(createOutsourceTest(toPayload(form)));
    setSaving(false);
    if (createOutsourceTest.fulfilled.match(result)) setForm(EMPTY_TEST);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm({ name: t.name, testCode: t.test_code ?? '', suggestedPrice: t.suggested_price != null ? String(t.suggested_price) : '' });
  }

  async function saveEdit(id) {
    await dispatch(updateOutsourceTest({ id, ...toPayload(editForm) }));
    setEditingId(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? tests.filter((t) => t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q)) : tests;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Tests you send out, kept separate from the processing lab's Test Catalog. Set what each lab charges
        under Labs → Manage Rates; the suggested price is only the default patient rate on the order form.
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Test name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Urine Culture & Sensitivity"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Code <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.testCode}
            onChange={(e) => setForm((f) => ({ ...f, testCode: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Suggested price</label>
          <input
            type="number" min="0" step="0.01"
            value={form.suggestedPrice}
            onChange={(e) => setForm((f) => ({ ...f, suggestedPrice: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Test'}</Button>
      </form>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or code…"
        className="border rounded px-3 py-1.5 text-sm w-64 mb-3"
      />

      {testsLoading && tests.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">{tests.length === 0 ? 'No outsource tests yet — add one above.' : 'No tests match.'}</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Suggested Price</th>
                <th className="px-4 py-2 font-medium">Offered By (cost)</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${!t.active ? 'opacity-50' : ''}`}>
                  {editingId === t.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.testCode} onChange={(e) => setEditForm((f) => ({ ...f, testCode: e.target.value }))} className="w-24 border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="0.01" value={editForm.suggestedPrice} onChange={(e) => setEditForm((f) => ({ ...f, suggestedPrice: e.target.value }))} className="w-28 border rounded px-2 py-1" />
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(t.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{t.test_code || '—'}</td>
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-4 py-2">{t.suggested_price != null ? money(t.suggested_price) : '—'}</td>
                      <td className="px-4 py-2 text-xs">
                        {t.labs?.length
                          ? t.labs.map((l) => `${l.outsourceLabName} ${money(l.cost)}`).join(' · ')
                          : <span className="text-amber-600">No lab yet — set a rate under Labs</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => startEdit(t)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => dispatch(updateOutsourceTest({ id: t.id, active: !t.active }))} className="text-gray-500">
                          {t.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

const TABS = [
  { key: 'orders',   label: 'Orders',   Component: OrdersTab },
  { key: 'payables', label: 'Payables', Component: PayablesTab },
  { key: 'labs',     label: 'Labs',     Component: LabsTab },
  { key: 'tests',    label: 'Tests',    Component: TestsTab },
];

const DEFAULT_TAB = 'orders';

export default function OutsourcePage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TABS.some((t) => t.key === requested) ? requested : DEFAULT_TAB;
  const Active = TABS.find((t) => t.key === tab).Component;

  // Shared by the Orders tab's lab filter and the Labs tab, which manages
  // inactive labs too — so it's fetched once here, inactive included.
  useEffect(() => { dispatch(fetchOutsourceLabs({ includeInactive: true })); }, [dispatch]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Outsourcing</h1>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Tests you send to other labs. The lab is picked per test on each order, so the same test can go to
        different labs. (Labs that send samples to you are under Partner Labs.)
      </p>

      <div className="flex gap-1 mb-5 flex-wrap">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Active />
    </div>
  );
}
