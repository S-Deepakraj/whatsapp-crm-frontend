import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTechnicians, createTechnician, updateTechnician, enableAccess, resetAccess, revokeAccess } from '../store/technicianSlice';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { buildTechnicianAccessMessage } from '../utils/messageBuilder';
import { Button } from '../components/ui/button';

const EMPTY_FORM = { name: '', phone: '' };

function CredentialsModal({ technician, phone, password, onClose }) {
  const settings = useAppSelector((s) => s.settings.data);

  function sendWhatsApp() {
    const message = buildTechnicianAccessMessage(settings, technician.name, phone, password);
    window.open(buildWhatsAppLink(phone, message), '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">App Access — {technician.name}</h2>
        <p className="text-sm text-gray-500 mb-4">
          This password is shown once — share it now. {technician.name} can change it after logging in.
        </p>
        <div className="bg-gray-50 border rounded p-3 space-y-1 text-sm mb-4">
          <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{phone}</span></p>
          <p><span className="text-gray-500">Password:</span> <span className="font-mono font-medium">{password}</span></p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={sendWhatsApp} className="bg-green-600 hover:bg-green-700">Send via WhatsApp</Button>
        </div>
      </div>
    </div>
  );
}

export default function TechniciansPage() {
  const dispatch = useAppDispatch();
  const { data: technicians, loading } = useAppSelector((s) => s.technicians);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [credentials, setCredentials] = useState(null); // { technician, phone, password }
  const [accessBusyId, setAccessBusyId] = useState(null);

  useEffect(() => { dispatch(fetchTechnicians()); }, [dispatch]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    setError(null);
    const result = await dispatch(createTechnician({ name: form.name.trim(), phone: form.phone.trim() }));
    setSaving(false);
    if (createTechnician.fulfilled.match(result)) {
      setForm(EMPTY_FORM);
    } else {
      setError(result.error?.message || 'Failed to add technician.');
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm({ name: t.name, phone: t.phone });
  }

  async function saveEdit(id) {
    await dispatch(updateTechnician({ id, name: editForm.name.trim(), phone: editForm.phone.trim() }));
    setEditingId(null);
  }

  function toggleActive(t) {
    dispatch(updateTechnician({ id: t.id, active: !t.active }));
  }

  async function handleEnableAccess(t) {
    setAccessBusyId(t.id);
    const result = await dispatch(enableAccess(t.id));
    setAccessBusyId(null);
    if (enableAccess.fulfilled.match(result)) {
      setCredentials({ technician: t, phone: result.payload.phone, password: result.payload.password });
    } else {
      setError(result.error?.message || 'Failed to enable access.');
    }
  }

  async function handleResetAccess(t) {
    setAccessBusyId(t.id);
    const result = await dispatch(resetAccess(t.id));
    setAccessBusyId(null);
    if (resetAccess.fulfilled.match(result)) {
      setCredentials({ technician: t, phone: result.payload.phone, password: result.payload.password });
    } else {
      setError(result.error?.message || 'Failed to reset password.');
    }
  }

  async function handleRevokeAccess(t) {
    if (!window.confirm(`Revoke app access for ${t.name}?`)) return;
    setAccessBusyId(t.id);
    await dispatch(revokeAccess(t.id));
    setAccessBusyId(null);
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Technicians</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        Technicians get assignments and updates over WhatsApp by default. Give someone app access below if you want them to see their whole day in one place and log field-collected orders themselves — they'll never see prices or rates anywhere in the app. Deactivate someone who's left rather than deleting them, so past assignments stay intact.
      </p>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Ramesh"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 9876543210"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Adding…' : '+ Add Technician'}
        </Button>
      </form>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : technicians.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No technicians yet — add one above.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">App Access</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${!t.active ? 'opacity-50' : ''}`}>
                  {editingId === t.id ? (
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
                      <td className="px-4 py-2 text-gray-400">{t.active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2 text-gray-400">—</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(t.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-4 py-2">{t.phone}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.has_access ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.has_access ? `Enabled · ${t.login_phone}` : 'No login'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => startEdit(t)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => toggleActive(t)} className="text-gray-500 mr-1">
                          {t.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        {t.has_access ? (
                          <>
                            <Button variant="link" size="xs" disabled={accessBusyId === t.id} onClick={() => handleResetAccess(t)} className="text-gray-500 mr-1">
                              Reset Password
                            </Button>
                            <Button variant="link" size="xs" disabled={accessBusyId === t.id} onClick={() => handleRevokeAccess(t)} className="text-red-500">
                              Revoke Access
                            </Button>
                          </>
                        ) : (
                          <Button variant="link" size="xs" disabled={accessBusyId === t.id} onClick={() => handleEnableAccess(t)} className="text-blue-600">
                            Enable App Access
                          </Button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {credentials && (
        <CredentialsModal
          technician={credentials.technician}
          phone={credentials.phone}
          password={credentials.password}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
