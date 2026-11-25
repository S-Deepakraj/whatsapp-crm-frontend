import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, X } from 'lucide-react';
import api from '../services/api';
import { publishToast } from '../utils/toastBus';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { Button } from '../components/ui/button';
import { useDebounce } from '../hooks/useDebounce';

// Inbox for booking requests submitted on the public website. A request
// is a lead, not an order: confirm it with the customer, then "Convert
// to order" to create the real order (customer is matched by phone, or
// created). Requests that never convert stay here for ad/enquiry history.

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'converted', label: 'Converted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'spam', label: 'Spam' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLE = {
  new: 'bg-orange-100 text-orange-700',
  contacted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  converted: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  spam: 'bg-red-100 text-red-600',
};

const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function source(r) {
  if (r.gclid || r.utm_source === 'google') {
    return { label: `Google Ads${r.utm_campaign ? ` · ${r.utm_campaign}` : ''}`, cls: 'bg-yellow-100 text-yellow-800' };
  }
  if (r.utm_source) return { label: [r.utm_source, r.utm_campaign].filter(Boolean).join(' · '), cls: 'bg-purple-100 text-purple-700' };
  return { label: 'Website', cls: 'bg-gray-100 text-gray-600' };
}

function waMessage(r) {
  const tests = (r.items ?? []).map((i) => i.name).join(', ');
  return `Hi ${r.name}, this is Thyrocare Salem about your booking ${r.ref_code} (${tests}) for ${fmtDate(r.preferred_date)}, ${r.preferred_slot}. Can we confirm the slot?`;
}

function Detail({ id, onClose, onChanged }) {
  const [r, setR] = useState(null);
  const [staffNotes, setStaffNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [convert, setConvert] = useState(null); // { scheduledDate, slotStart, slotEnd, collectionAddress, prices }

  const load = useCallback(async () => {
    const { data } = await api.get(`/booking-requests/${id}`);
    setR(data);
    setStaffNotes(data.staff_notes ?? '');
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!r) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  const isHome = r.collection_type === 'home';
  const address = [r.address, r.landmark && `Landmark: ${r.landmark}`, r.area, r.pincode].filter(Boolean).join(', ');
  const src = source(r);

  async function setStatus(status) {
    setBusy(true);
    try {
      await api.patch(`/booking-requests/${id}`, { status });
      await load();
      onChanged();
    } finally { setBusy(false); }
  }

  async function saveNotes() {
    await api.patch(`/booking-requests/${id}`, { staffNotes });
    publishToast({ message: 'Notes saved', type: 'success' });
  }

  function startConvert() {
    const [slotStart, slotEnd] = r.preferred_slot.split('-');
    setConvert({
      scheduledDate: String(r.preferred_date).slice(0, 10),
      slotStart, slotEnd,
      collectionAddress: address,
      prices: Object.fromEntries((r.items ?? []).map((i) => [i.testCatalogId, i.offerPrice ?? i.mrp ?? ''])),
    });
  }

  async function doConvert() {
    setBusy(true);
    try {
      const prices = Object.fromEntries(Object.entries(convert.prices).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
      const body = { scheduledDate: convert.scheduledDate, prices };
      if (isHome) Object.assign(body, { slotStart: convert.slotStart, slotEnd: convert.slotEnd, collectionAddress: convert.collectionAddress });
      const { data } = await api.post(`/booking-requests/${id}/convert`, body);
      publishToast({ message: `Order #${data.order.id} created`, type: 'success' });
      setConvert(null);
      await load();
      onChanged();
    } catch { /* toast shown by api interceptor */ } finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 font-mono">{r.ref_code} · {fmtDateTime(r.created_at)}</p>
          <h2 className="text-lg font-semibold">{r.name}</h2>
          <p className="text-sm text-gray-500">{r.phone}{r.email ? ` · ${r.email}` : ''}{r.age ? ` · ${r.age}y` : ''}{r.gender ? ` · ${r.gender}` : ''}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          <a href={buildWhatsAppLink(`91${r.phone}`, waMessage(r))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </Button>
        <Button asChild size="sm" variant="outline"><a href={`tel:+91${r.phone}`}><Phone /> Call</a></Button>
        <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
        <span className={`text-xs px-2 py-1 rounded ${src.cls}`}>{src.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-gray-400">Preferred</p><p className="font-medium">{fmtDate(r.preferred_date)}, {r.preferred_slot}</p></div>
        <div><p className="text-xs text-gray-400">Collection</p><p className="font-medium">{isHome ? 'Home collection' : 'Walk-in at lab'}</p></div>
        {isHome && <div className="col-span-2"><p className="text-xs text-gray-400">Address</p><p>{address}</p></div>}
        {r.customer_notes && <div className="col-span-2"><p className="text-xs text-gray-400">Customer note</p><p>{r.customer_notes}</p></div>}
      </div>

      <div className="border rounded">
        {(r.items ?? []).map((i) => (
          <div key={i.slug} className="flex justify-between gap-2 px-3 py-2 text-sm border-b last:border-0">
            <span>{i.name}</span>
            <span className="whitespace-nowrap">
              {i.offerPrice != null && <span className="text-gray-400 line-through mr-1">{inr(i.mrp)}</span>}
              {inr(i.offerPrice ?? i.mrp)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 text-sm font-semibold bg-gray-50">
          <span>Quoted total</span><span>{inr(r.estimated_total)}</span>
        </div>
      </div>

      {r.order_id ? (
        <p className="text-sm">Converted to <Link to="/orders" className="text-blue-600 underline">order #{r.order_id}</Link>.</p>
      ) : convert ? (
        <div className="border rounded p-3 space-y-2 bg-gray-50">
          <p className="text-sm font-medium">Create order</p>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={convert.scheduledDate} onChange={(e) => setConvert({ ...convert, scheduledDate: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            {isHome && <>
              <input type="time" value={convert.slotStart} onChange={(e) => setConvert({ ...convert, slotStart: e.target.value })} className="border rounded px-2 py-1 text-sm" />
              <input type="time" value={convert.slotEnd} onChange={(e) => setConvert({ ...convert, slotEnd: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            </>}
          </div>
          {isHome && <textarea rows={2} value={convert.collectionAddress} onChange={(e) => setConvert({ ...convert, collectionAddress: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />}
          {(r.items ?? []).map((i) => (
            <label key={i.testCatalogId} className="flex items-center justify-between gap-2 text-sm">
              <span>{i.name}</span>
              <input type="number" min="0" value={convert.prices[i.testCatalogId]} onChange={(e) => setConvert({ ...convert, prices: { ...convert.prices, [i.testCatalogId]: e.target.value } })} className="w-24 border rounded px-2 py-1" />
            </label>
          ))}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setConvert(null)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={doConvert}>{busy ? 'Creating…' : 'Create order'}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={startConvert}>Convert to order</Button>
          {r.status === 'new' && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('contacted')}>Mark contacted</Button>}
          {['new', 'contacted'].includes(r.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('confirmed')}>Mark confirmed</Button>}
          {r.status !== 'cancelled' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus('cancelled')}>Cancel</Button>}
          {r.status !== 'spam' && <Button size="sm" variant="ghost" className="text-red-500" disabled={busy} onClick={() => setStatus('spam')}>Spam</Button>}
        </div>
      )}

      <div>
        <p className="text-xs text-gray-400 mb-1">Staff notes</p>
        <textarea rows={2} value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} onBlur={() => staffNotes !== (r.staff_notes ?? '') && saveNotes()} className="w-full border rounded px-2 py-1 text-sm" />
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">Source & history</summary>
        <div className="mt-2 space-y-1">
          {r.landing_page && <p>Landing page: <span className="font-mono">{r.landing_page}</span></p>}
          {r.utm_term && <p>Keyword: {r.utm_term}</p>}
          {r.gclid && <p className="break-all">gclid: <span className="font-mono">{r.gclid}</span></p>}
          {r.referrer && <p className="break-all">Referrer: {r.referrer}</p>}
          {r.history.map((h) => (
            <p key={h.id}>{fmtDateTime(h.created_at)} — {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}{h.note ? ` (${h.note})` : ''}{h.changed_by_email ? ` · ${h.changed_by_email}` : ''}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

export default function BookingRequestsPage() {
  const [tab, setTab] = useState('new');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, c] = await Promise.all([
        api.get('/booking-requests', { params: { status: tab, q: debouncedQ || undefined, limit: 100 } }),
        api.get('/booking-requests/counts'),
      ]);
      setRows(list.data.data);
      setCounts(c.data);
    } finally { setLoading(false); }
  }, [tab, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Website Bookings</h1>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Booking requests from the website. Call or WhatsApp the customer to confirm, then convert the request into an order.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); }}
            className={`text-sm px-3 py-1.5 rounded-full border ${tab === t.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600'}`}
          >
            {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, SAL-…" className="ml-auto border rounded px-3 py-1.5 text-sm w-full sm:w-64" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">No requests here.</p>
          ) : rows.map((r) => {
            const src = source(r);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-gray-50 ${selected === r.id ? 'bg-gray-50' : ''}`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-sm">{r.name} <span className="text-gray-400 font-normal">{r.phone}</span></p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium h-fit ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{(r.items ?? []).map((i) => i.name).join(', ')}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                  <span className="font-mono">{r.ref_code}</span>
                  <span>· wants {fmtDate(r.preferred_date)} {r.preferred_slot}</span>
                  <span>· {inr(r.estimated_total)}</span>
                  <span className={`px-1.5 py-0.5 rounded ${src.cls}`}>{src.label}</span>
                  <span className="ml-auto">{fmtDateTime(r.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="bg-white rounded-xl shadow-sm border h-fit lg:sticky lg:top-4">
            <Detail key={selected} id={selected} onClose={() => setSelected(null)} onChanged={load} />
          </div>
        )}
      </div>
    </div>
  );
}
