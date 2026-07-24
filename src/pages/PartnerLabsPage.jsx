import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchPartnerLabs, createPartnerLab, updatePartnerLab } from '../store/partnerLabSlice';
import { Button } from '../components/ui/button';

const EMPTY_FORM = { name: '', phone: '' };

export default function PartnerLabsPage() {
  const dispatch = useAppDispatch();
  const { data: labs, loading } = useAppSelector((s) => s.partnerLabs);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => { dispatch(fetchPartnerLabs()); }, [dispatch]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await dispatch(createPartnerLab({ name: form.name.trim(), phone: form.phone.trim() || null }));
    setSaving(false);
    if (createPartnerLab.fulfilled.match(result)) {
      setForm(EMPTY_FORM);
    } else {
      setError(result.error?.message || 'Failed to add partner lab.');
    }
  }

  function startEdit(l) {
    setEditingId(l.id);
    setEditForm({ name: l.name, phone: l.phone ?? '' });
  }

  async function saveEdit(id) {
    await dispatch(updatePartnerLab({ id, name: editForm.name.trim(), phone: editForm.phone.trim() || null }));
    setEditingId(null);
  }

  function toggleActive(l) {
    dispatch(updatePartnerLab({ id: l.id, active: !l.active }));
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Partner Labs</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        Other labs and collection centers that send samples here for processing (ILS orders). Each lab has its own negotiated rate per test — set those from "Manage Rates".
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sunrise Collection Center"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 9876543210"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Adding…' : '+ Add Partner Lab'}
        </Button>
      </form>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : labs.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No partner labs yet — add one above.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Name</th>
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
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
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
                      <td className="px-4 py-2">{l.phone || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${l.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button asChild variant="link" size="xs" className="text-blue-600 mr-1">
                          <Link to={`/partner-labs/${l.id}/rates`}>Manage Rates</Link>
                        </Button>
                        <Button variant="link" size="xs" onClick={() => startEdit(l)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => toggleActive(l)} className="text-gray-500">
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
