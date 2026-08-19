import { Fragment, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchSettlements, fetchSettlement, fetchDailySummary, settleLabDay,
  addReceipt, addAdjustment, resolveSettlement,
} from '../store/settlementSlice';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { buildSettlementRequestMessage } from '../utils/messageBuilder';
import { Button } from '../components/ui/button';

const STATUS_STYLES = {
  awaiting: { label: 'Awaiting', className: 'bg-gray-100 text-gray-600' },
  pending:  { label: 'Pending',  className: 'bg-gray-100 text-gray-600' },
  matched:  { label: 'Matched',  className: 'bg-green-100 text-green-700' },
  short:    { label: 'Short',    className: 'bg-red-100 text-red-600' },
  over:     { label: 'Over',     className: 'bg-amber-100 text-amber-700' },
};

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const REASON_LABEL = {
  rejected_sample: 'Rejected sample',
  dispute: 'Dispute',
  write_off: 'Write-off',
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

// A settlement can be paid in more than one piece — cash+UPI split same
// day, most commonly — so this collects one or more amount+method lines
// instead of a single field. An empty trailing line is always kept so
// "add another" is just typing into it, not a separate click first.
function useReceiptLines(initialAmount) {
  const [lines, setLines] = useState([{ amount: initialAmount, method: 'cash' }]);

  function updateLine(i, patch) {
    setLines((ls) => {
      const next = ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
      const last = next[next.length - 1];
      if (last.amount !== '' && Number(last.amount) > 0) next.push({ amount: '', method: 'cash' });
      return next;
    });
  }

  function removeLine(i) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));
  }

  const filled = lines.filter((l) => l.amount !== '' && Number(l.amount) > 0);
  const total = filled.reduce((sum, l) => sum + Number(l.amount), 0);

  return { lines, updateLine, removeLine, filled, total };
}

function ReceiptLinesEditor({ lines, updateLine, removeLine }) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number" min="0" step="0.01"
            placeholder="Amount"
            value={line.amount}
            onChange={(e) => updateLine(i, { amount: e.target.value })}
            className="w-32 border rounded px-3 py-2 text-sm"
          />
          <select
            value={line.method}
            onChange={(e) => updateLine(i, { method: e.target.value })}
            className="w-40 border rounded px-3 py-2 text-sm"
          >
            {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {lines.length > 1 && i < lines.length - 1 && (
            <button type="button" onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 text-sm px-1">✕</button>
          )}
        </div>
      ))}
    </div>
  );
}

function SettleForm({ row, date, onDone }) {
  const dispatch = useAppDispatch();
  const { lines, updateLine, removeLine, filled, total } = useReceiptLines(String(row.expectedAmount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!filled.length) return setError('Enter at least one amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(settleLabDay({
      partnerLabId: row.partnerLabId,
      settlementDate: date,
      receipts: filled.map((l) => ({ amount: Number(l.amount), method: l.method })),
    }));
    setSaving(false);
    if (settleLabDay.fulfilled.match(result)) onDone();
    else setError(result.error?.message || 'Failed to settle.');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border rounded p-3 space-y-3">
      <ReceiptLinesEditor lines={lines} updateLine={updateLine} removeLine={removeLine} />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          Total: <span className="font-medium text-gray-800">{money(total)}</span>
          <span className="text-gray-400"> of {money(row.expectedAmount)} expected</span>
        </span>
        <Button type="submit" disabled={saving}>{saving ? 'Settling…' : 'Settle'}</Button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}

// Adds one receipt line to a settlement that already exists — used for a
// still-open settlement (short/pending), whether that's the second half
// of a same-day split payment or an installment arriving days later.
function ReceiptForm({ settlement, onDone }) {
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [receivedAt, setReceivedAt] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(addReceipt({ id: settlement.id, amount: Number(amount), method, receivedAt }));
    setSaving(false);
    if (addReceipt.fulfilled.match(result)) onDone();
    else setError(result.error?.message || 'Failed to record receipt.');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-gray-50 border rounded p-3">
      <div className="w-32">
        <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
        <input
          type="number" min="0.01" step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="w-40">
        <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div className="w-40">
        <label className="block text-xs font-medium text-gray-500 mb-1">Received on</label>
        <input
          type="date"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          max={today()}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Receipt'}</Button>
      {error && <p className="text-red-500 text-sm w-full">{error}</p>}
    </form>
  );
}

function AdjustmentForm({ settlement, onDone }) {
  const dispatch = useAppDispatch();
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('rejected_sample');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount) return setError('Enter an amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(addAdjustment({
      id: settlement.id,
      orderId: orderId ? Number(orderId) : null,
      amount: Number(amount),
      reason,
      notes: notes.trim() || null,
    }));
    setSaving(false);
    if (addAdjustment.fulfilled.match(result)) {
      setAmount(''); setOrderId(''); setNotes('');
      onDone();
    } else {
      setError(result.error?.message || 'Failed to add adjustment.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-gray-50 border rounded p-3">
      <div className="w-32">
        <label className="block text-xs font-medium text-gray-500 mb-1">Order ID <span className="text-gray-400 font-normal">(optional)</span></label>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          <option value="">—</option>
          {settlement.orders.map((o) => <option key={o.order_id ?? o.orderId} value={o.order_id ?? o.orderId}>#{o.order_id ?? o.orderId}</option>)}
        </select>
      </div>
      <div className="w-32">
        <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div className="w-40">
        <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          {Object.entries(REASON_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add Adjustment'}</Button>
      {error && <p className="text-red-500 text-sm w-full">{error}</p>}
    </form>
  );
}

// Full detail for a settlement that already exists (real DB row) —
// used by both the Daily view (once a row is settled/pending) and History.
function SettlementDetail({ settlementId, onChanged }) {
  const dispatch = useAppDispatch();
  const { current, currentLoading } = useAppSelector((s) => s.settlements);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  useEffect(() => { dispatch(fetchSettlement(settlementId)); }, [dispatch, settlementId]);

  function refetch() {
    dispatch(fetchSettlement(settlementId));
    onChanged?.();
  }

  async function handleResolve() {
    setResolving(true);
    setResolveError(null);
    const result = await dispatch(resolveSettlement(settlementId));
    setResolving(false);
    if (!resolveSettlement.fulfilled.match(result)) {
      setResolveError(result.error?.message || 'Adjustments don\'t fully account for the gap yet.');
    } else {
      onChanged?.();
    }
  }

  if (currentLoading || !current || current.id !== settlementId) {
    return <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>;
  }

  const s = current;
  const gap = parseFloat(s.expected_amount) - parseFloat(s.amount_received || 0);
  const adjustedTotal = s.adjustments.reduce((sum, a) => sum + parseFloat(a.amount), 0);

  return (
    <div className="px-4 py-4 space-y-4 bg-gray-50/60">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Linked orders ({s.orders.length})</p>
        <ul className="border rounded bg-white divide-y text-sm">
          {s.orders.map((o) => (
            <li key={o.order_id} className="px-3 py-1.5 flex justify-between">
              <span>#{o.order_id} {o.patient_name}</span>
              <span className="text-gray-500">{money(o.expected_amount)}</span>
            </li>
          ))}
        </ul>
      </div>

      {s.receipts?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Receipts ({s.receipts.length})</p>
          <ul className="border rounded bg-white divide-y text-sm">
            {s.receipts.map((r) => (
              <li key={r.id} className="px-3 py-1.5 flex justify-between">
                <span>{METHOD_OPTIONS.find((m) => m.value === r.method)?.label ?? r.method} · {formatDate(r.received_at)}</span>
                <span className="text-gray-500">{money(r.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(s.status === 'pending' || s.status === 'short') && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Add another receipt (more still expected)</p>
          <ReceiptForm settlement={s} onDone={refetch} />
        </div>
      )}

      {(s.status === 'short' || s.status === 'over') && (
        <>
          <div className="text-sm">
            <span className="font-medium">{s.status === 'short' ? 'Short by' : 'Over by'} {money(Math.abs(gap))}</span>
            {s.adjustments.length > 0 && (
              <span className="text-gray-500"> · {money(adjustedTotal)} adjusted so far</span>
            )}
            {s.resolved_at && <span className="text-green-600"> · resolved {formatDate(s.resolved_at)}</span>}
          </div>

          {s.adjustments.length > 0 && (
            <ul className="border rounded bg-white divide-y text-sm">
              {s.adjustments.map((a) => (
                <li key={a.id} className="px-3 py-1.5 flex justify-between">
                  <span>
                    {REASON_LABEL[a.reason]}{a.order_id ? ` · #${a.order_id}` : ''}
                    {a.notes ? ` — ${a.notes}` : ''}
                  </span>
                  <span className="text-gray-500">{money(a.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {!s.resolved_at && (
            <>
              <p className="text-xs font-medium text-gray-500">Or explain the gap as final (rejected sample, write-off, etc.)</p>
              <AdjustmentForm settlement={s} onDone={refetch} />
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleResolve} disabled={resolving}>
                  {resolving ? 'Resolving…' : 'Mark Resolved'}
                </Button>
                {resolveError && <p className="text-red-500 text-sm">{resolveError}</p>}
              </div>
            </>
          )}
        </>
      )}

      {s.status === 'matched' && (
        <p className="text-sm text-green-700">Matched — received amount equals the expected total.</p>
      )}
    </div>
  );
}

function WhatsAppButton({ row, date }) {
  const settings = useAppSelector((s) => s.settings.data);

  if (!row.phone || row.orders.length === 0) return null;

  function handleClick() {
    const message = buildSettlementRequestMessage(settings, row.partnerLabName, date, row.orders, row.expectedAmount);
    window.open(buildWhatsAppLink(row.phone, message), '_blank');
  }

  return <Button variant="link" size="xs" onClick={handleClick} className="text-green-600">WhatsApp</Button>;
}

function DailyView() {
  const dispatch = useAppDispatch();
  const { daily, dailyLoading } = useAppSelector((s) => s.settlements);
  const [date, setDate] = useState(today());
  const [expandedLabId, setExpandedLabId] = useState(null);

  function refetch() { dispatch(fetchDailySummary(date)); }

  useEffect(() => { dispatch(fetchDailySummary(date)); }, [dispatch, date]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setExpandedLabId(null); }}
          max={today()}
          className="border rounded px-3 py-1.5 text-sm"
        />
        {date === today() && <span className="text-xs text-gray-400">Today</span>}
      </div>

      {dailyLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : daily.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No ILS orders or settlements for this date.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Partner Lab</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daily.map((row) => {
                const rowKey = `${row.partnerLabId}-${row.settlementId ?? 'awaiting'}`;
                const expanded = expandedLabId === rowKey;
                return (
                  <Fragment key={rowKey}>
                    <tr className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{row.partnerLabName}</td>
                      <td className="px-4 py-2 text-gray-500">{row.orderCount}</td>
                      <td className="px-4 py-2">{money(row.expectedAmount)}</td>
                      <td className="px-4 py-2">{row.amountReceived != null ? money(row.amountReceived) : '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[row.status]?.className}`}>
                          {STATUS_STYLES[row.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <WhatsAppButton row={row} date={date} />
                        <Button variant="link" size="xs" onClick={() => setExpandedLabId(expanded ? null : rowKey)} className="ml-1">
                          {expanded ? 'Hide' : (row.settlementId ? 'Details' : 'Settle')}
                        </Button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={6} className="p-0 border-b">
                          {row.settlementId
                            ? <SettlementDetail settlementId={row.settlementId} onChanged={refetch} />
                            : (
                              <div className="px-4 py-4 bg-gray-50/60">
                                <SettleForm row={row} date={date} onDone={() => { setExpandedLabId(null); refetch(); }} />
                              </div>
                            )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryView() {
  const dispatch = useAppDispatch();
  const { data: settlements, loading } = useAppSelector((s) => s.settlements);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dispatch(fetchSettlements(statusFilter !== 'all' ? { status: statusFilter } : {}));
  }, [dispatch, statusFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="all">All statuses</option>
          {['pending', 'matched', 'short', 'over'].map((v) => <option key={v} value={v}>{STATUS_STYLES[v].label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : settlements.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No settlements recorded yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Partner Lab</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b last:border-0">
                    <td className="px-4 py-2">{formatDate(s.settlement_date)}</td>
                    <td className="px-4 py-2 font-medium">{s.partner_lab_name}</td>
                    <td className="px-4 py-2 text-gray-500">{s.order_count}</td>
                    <td className="px-4 py-2">{money(s.expected_amount)}</td>
                    <td className="px-4 py-2">{s.amount_received != null ? money(s.amount_received) : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[s.status]?.className}`}>
                        {STATUS_STYLES[s.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="link" size="xs" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                        {expandedId === s.id ? 'Hide' : 'Details'}
                      </Button>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b">
                        <SettlementDetail settlementId={s.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'daily',   label: 'Today' },
  { key: 'history', label: 'History' },
];

export default function SettlementsPage() {
  const [tab, setTab] = useState('daily');

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        One lump-sum payment per partner lab per day, covering that day's ILS samples. "Today" auto-lists every lab with orders on the selected date — pick what they actually paid, no separate creation step.
      </p>

      <div className="flex gap-1 mb-5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'daily' ? <DailyView /> : <HistoryView />}
    </div>
  );
}
