import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { publishToast } from '../utils/toastBus';
import { Button } from '../components/ui/button';

// Customer-facing offers shown on the public site (/offers, home page,
// and as a struck-through MRP on every covered test/package card).
// Saving here refreshes the public site immediately.

const PORTAL_URL = import.meta.env.VITE_CUSTOMER_PORTAL_URL || 'https://www.thyrocaresalem.in';

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// <input type="datetime-local"> works in local time without a zone.
function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d;
}

const inr = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

const EMPTY_FORM = {
  id: null,
  title: '',
  slug: '',
  slugTouched: false,
  subtitle: '',
  description: '',
  terms: '',
  badgeText: '',
  bannerUrl: '',
  startsAt: toLocalInput(new Date()),
  endsAt: toLocalInput(inDays(30)),
  isActive: true,
  showOnHome: true,
  sortOrder: 0,
  items: [], // { testCatalogId, offerPrice }
};

function offerState(o) {
  const now = Date.now();
  if (!o.is_active) return { label: 'Paused', cls: 'bg-gray-100 text-gray-500' };
  if (new Date(o.ends_at).getTime() <= now) return { label: 'Expired', cls: 'bg-gray-100 text-gray-500' };
  if (new Date(o.starts_at).getTime() > now) return { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Live', cls: 'bg-green-100 text-green-700' };
}

function OfferForm({ initial, tests, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const testsById = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);
  const selectedIds = new Set(form.items.map((i) => i.testCatalogId));

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return tests
      .filter((t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(q))
      .sort((a, b) => (a.category === 'package' ? -1 : 0) - (b.category === 'package' ? -1 : 0))
      .slice(0, 12);
  }, [search, tests, form.items]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function addItem(t) {
    set({ items: [...form.items, { testCatalogId: t.id, offerPrice: t.mrp ? Math.round(Number(t.mrp) * 0.8) : '' }] });
    setSearch('');
  }

  function updateItem(id, offerPrice) {
    set({ items: form.items.map((i) => (i.testCatalogId === id ? { ...i, offerPrice } : i)) });
  }

  function removeItem(id) {
    set({ items: form.items.filter((i) => i.testCatalogId !== id) });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give the offer a title');
    if (!form.slug) return setError('Slug is required');
    if (form.items.length === 0) return setError('Add at least one test or package');
    if (form.items.some((i) => i.offerPrice === '' || Number(i.offerPrice) < 0)) return setError('Enter an offer price for every item');
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return setError('End must be after start');

    const payload = {
      title: form.title.trim(),
      slug: form.slug,
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      terms: form.terms.trim() || null,
      badgeText: form.badgeText.trim() || null,
      bannerUrl: form.bannerUrl.trim() || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      isActive: form.isActive,
      showOnHome: form.showOnHome,
      sortOrder: Number(form.sortOrder) || 0,
      items: form.items.map((i) => ({ testCatalogId: i.testCatalogId, offerPrice: Number(i.offerPrice) })),
    };

    setSaving(true);
    setError(null);
    try {
      if (form.id) await api.patch(`/offers/${form.id}`, payload);
      else await api.post('/offers', payload);
      publishToast({ message: form.id ? 'Offer updated' : 'Offer created', type: 'success' });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  }

  const unpublished = form.items.filter((i) => {
    const t = testsById.get(i.testCatalogId);
    return t && (!t.published || !t.active);
  });

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{form.id ? 'Edit offer' : 'New offer'}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close"><X /></Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value, ...(form.slugTouched || form.id ? {} : { slug: slugify(e.target.value) }) })}
            placeholder="e.g. Winter Full Body Checkup Offer"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL slug</label>
          <div className="flex items-center border rounded text-sm">
            <span className="px-2 text-gray-400 whitespace-nowrap">/offers/</span>
            <input
              value={form.slug}
              onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })}
              className="w-full px-1 py-2 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle <span className="font-normal text-gray-400">(one line under the title)</span></label>
          <input value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Badge <span className="font-normal text-gray-400">(e.g. "30% OFF", "Limited time")</span></label>
          <input value={form.badgeText} maxLength={40} onChange={(e) => set({ badgeText: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Starts</label>
          <input type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ends</label>
          <input type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description <span className="font-normal text-gray-400">(shown on the offer page)</span></label>
        <textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Terms & conditions <span className="font-normal text-gray-400">(one per line)</span></label>
          <textarea rows={3} value={form.terms} onChange={(e) => set({ terms: e.target.value })} placeholder={'Valid for home collection in Salem\nCannot be combined with other offers'} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Banner image URL <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={form.bannerUrl} onChange={(e) => set({ bannerUrl: e.target.value })} placeholder="https://…" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.showOnHome} onChange={(e) => set({ showOnHome: e.target.checked })} /> Show on home page</label>
            <label className="flex items-center gap-1.5">Order <input type="number" min="0" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} className="w-16 border rounded px-2 py-1" /></label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Tests & packages in this offer</label>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the catalogue to add (packages listed first)…"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto bg-white border rounded shadow-lg">
              {matches.map((t) => (
                <button key={t.id} type="button" onClick={() => addItem(t)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2">
                  <span>{t.name} <span className="text-xs text-gray-400">{t.category}</span>{!t.published && <span className="ml-1 text-xs text-amber-600">not published</span>}</span>
                  <span className="text-gray-500">{inr(t.mrp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {form.items.length > 0 && (
          <div className="mt-2 overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">MRP</th>
                  <th className="px-3 py-2 font-medium">Offer price</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
                  <th className="px-3 py-2 font-medium">Margin vs B2B</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.items.map((i) => {
                  const t = testsById.get(i.testCatalogId) ?? {};
                  const mrp = t.mrp != null ? Number(t.mrp) : null;
                  const price = i.offerPrice === '' ? null : Number(i.offerPrice);
                  const pct = mrp && price != null ? Math.round((1 - price / mrp) * 100) : null;
                  const margin = t.b2b_rate != null && price != null ? price - Number(t.b2b_rate) : null;
                  return (
                    <tr key={i.testCatalogId} className="border-b last:border-0">
                      <td className="px-3 py-2">{t.name ?? `#${i.testCatalogId}`}</td>
                      <td className="px-3 py-2 text-gray-500">{inr(mrp)}</td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="1" value={i.offerPrice} onChange={(e) => updateItem(i.testCatalogId, e.target.value)} className="w-24 border rounded px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">{pct != null ? `${pct}%` : '—'}</td>
                      <td className={`px-3 py-2 ${margin != null && margin < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {margin != null ? inr(Math.round(margin)) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeItem(i.testCatalogId)} aria-label="Remove"><Trash2 /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {unpublished.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            {unpublished.length} item(s) aren't published on the website, so they won't appear on the offer page until you publish them in Test Catalog.
          </p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Create offer'}</Button>
      </div>
    </form>
  );
}

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // form initial state, or null

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/offers');
      setOffers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api.get('/test-catalog').then(({ data }) => setTests(data)).catch(() => {});
  }, []);

  async function startEdit(o) {
    const { data } = await api.get(`/offers/${o.id}`);
    setEditing({
      id: data.id,
      title: data.title,
      slug: data.slug,
      slugTouched: true,
      subtitle: data.subtitle ?? '',
      description: data.description ?? '',
      terms: data.terms ?? '',
      badgeText: data.badge_text ?? '',
      bannerUrl: data.banner_url ?? '',
      startsAt: toLocalInput(data.starts_at),
      endsAt: toLocalInput(data.ends_at),
      isActive: data.is_active,
      showOnHome: data.show_on_home,
      sortOrder: data.sort_order,
      items: data.items.map((i) => ({ testCatalogId: i.test_catalog_id, offerPrice: Number(i.offer_price) })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleActive(o) {
    await api.patch(`/offers/${o.id}`, { isActive: !o.is_active });
    load();
  }

  async function remove(o) {
    if (!window.confirm(`Delete offer "${o.title}"? This can't be undone.`)) return;
    await api.delete(`/offers/${o.id}`);
    load();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Website Offers</h1>
          <p className="text-sm text-gray-500 max-w-2xl mt-1">
            Discounted prices on selected tests and packages for the public website. Live offers show on the home page,
            on <span className="font-mono">/offers</span>, and as a struck-through MRP on every covered item. Each offer
            also gets its own page — use it as a Google Ads landing page.
          </p>
        </div>
        {!editing && <Button onClick={() => setEditing({ ...EMPTY_FORM })}>+ New Offer</Button>}
      </div>

      {editing && (
        <OfferForm
          key={editing.id ?? 'new'}
          initial={editing}
          tests={tests}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : offers.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No offers yet — create one to start promoting packages.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Offer</th>
                <th className="px-4 py-2 font-medium">Items</th>
                <th className="px-4 py-2 font-medium">Runs</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const st = offerState(o);
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium">{o.title} {o.badge_text && <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{o.badge_text}</span>}</p>
                      <p className="text-xs text-gray-400 font-mono">/offers/{o.slug}{o.show_on_home ? ' · on home page' : ''}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{o.item_count}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(o.starts_at).toLocaleDateString('en-IN')} – {new Date(o.ends_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {st.label === 'Live' && (
                        <Button asChild variant="link" size="xs" className="text-gray-500">
                          <a href={`${PORTAL_URL}/offers/${o.slug}`} target="_blank" rel="noopener noreferrer">View <ExternalLink /></a>
                        </Button>
                      )}
                      <Button variant="link" size="xs" onClick={() => startEdit(o)}>Edit</Button>
                      <Button variant="link" size="xs" className="text-gray-500" onClick={() => toggleActive(o)}>{o.is_active ? 'Pause' : 'Activate'}</Button>
                      <Button variant="link" size="xs" className="text-red-500" onClick={() => remove(o)}>Delete</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
