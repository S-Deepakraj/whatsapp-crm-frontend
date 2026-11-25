import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '../services/api';
import { publishToast } from '../utils/toastBus';
import { Button } from '../components/ui/button';

// Hand-picked customer reviews shown on the public site's home page.
// Typically copied from the Google Business Profile. Saving here
// refreshes the public site immediately.

const EMPTY_FORM = {
  id: null,
  authorName: '',
  rating: 5,
  body: '',
  reviewDate: '',
  source: 'google',
  sourceUrl: '',
  published: true,
  sortOrder: 0,
};

const SOURCES = [
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Other' },
];

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star className={`size-4 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function TestimonialForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.authorName.trim()) return setError("Enter the reviewer's name");
    if (!form.body.trim()) return setError('Enter the review text');

    const payload = {
      authorName: form.authorName.trim(),
      rating: Number(form.rating),
      body: form.body.trim(),
      reviewDate: form.reviewDate || null,
      source: form.source,
      sourceUrl: form.sourceUrl.trim() || null,
      published: form.published,
      sortOrder: Number(form.sortOrder) || 0,
    };

    setSaving(true);
    setError(null);
    try {
      if (form.id) await api.patch(`/testimonials/${form.id}`, payload);
      else await api.post('/testimonials', payload);
      publishToast({ message: form.id ? 'Testimonial updated' : 'Testimonial added', type: 'success' });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{form.id ? 'Edit testimonial' : 'New testimonial'}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close"><X /></Button>
      </div>
      <p className="text-xs text-gray-500">
        Copy the review from your Google Business Profile, and use the reviewer's name as it appears on Google.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Reviewer name</label>
          <input value={form.authorName} maxLength={120} onChange={(e) => set({ authorName: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
          <div className="py-2"><Stars value={form.rating} onChange={(rating) => set({ rating })} /></div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Review date <span className="font-normal text-gray-400">(optional)</span></label>
          <input type="date" value={form.reviewDate} onChange={(e) => set({ reviewDate: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select value={form.source} onChange={(e) => set({ source: e.target.value })} className="w-full border rounded px-3 py-2 text-sm bg-white">
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Review text</label>
        <textarea rows={4} maxLength={3000} value={form.body} onChange={(e) => set({ body: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Link to the review <span className="font-normal text-gray-400">(optional; open it in Google Maps and use "Share")</span></label>
          <input value={form.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} placeholder="https://…" className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm pb-2">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} /> Show on website</label>
          <label className="flex items-center gap-1.5">Order <input type="number" min="0" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} className="w-16 border rounded px-2 py-1" /></label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add testimonial'}</Button>
      </div>
    </form>
  );
}

export default function TestimonialsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/testimonials');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(t) {
    setEditing({
      id: t.id,
      authorName: t.author_name,
      rating: t.rating,
      body: t.body,
      reviewDate: t.review_date ? String(t.review_date).slice(0, 10) : '',
      source: t.source,
      sourceUrl: t.source_url ?? '',
      published: t.published,
      sortOrder: t.sort_order,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function togglePublished(t) {
    await api.patch(`/testimonials/${t.id}`, { published: !t.published });
    load();
  }

  async function remove(t) {
    if (!window.confirm(`Delete the review by "${t.author_name}"? This can't be undone.`)) return;
    await api.delete(`/testimonials/${t.id}`);
    load();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Testimonials</h1>
          <p className="text-sm text-gray-500 max-w-2xl mt-1">
            Customer reviews shown on the website's home page, in the "What our customers say" section. Up to 12
            published reviews are shown, ordered by the Order number and then newest first.
          </p>
        </div>
        {!editing && <Button onClick={() => setEditing({ ...EMPTY_FORM })}>+ Add Testimonial</Button>}
      </div>

      {editing && (
        <TestimonialForm
          key={editing.id ?? 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No testimonials yet. Add your best Google reviews to show them on the website.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Review</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 max-w-xl">
                    <p className="font-medium">
                      {t.author_name}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {t.source}{t.review_date ? ` · ${new Date(t.review_date).toLocaleDateString('en-IN')}` : ''}
                      </span>
                    </p>
                    <p className="text-gray-600 line-clamp-2">{t.body}</p>
                  </td>
                  <td className="px-4 py-2"><Stars value={t.rating} /></td>
                  <td className="px-4 py-2 text-gray-500">{t.sort_order}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.published ? 'On website' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Button variant="link" size="xs" onClick={() => startEdit(t)}>Edit</Button>
                    <Button variant="link" size="xs" className="text-gray-500" onClick={() => togglePublished(t)}>{t.published ? 'Hide' : 'Show'}</Button>
                    <Button variant="link" size="xs" className="text-red-500" onClick={() => remove(t)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
