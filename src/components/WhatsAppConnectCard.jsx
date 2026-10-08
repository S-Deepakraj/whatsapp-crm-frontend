import { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from './ui/button';

const EMPTY = { phoneNumberId: '', wabaId: '', accessToken: '' };

// WhatsApp Cloud API connection. The backend checks the details with Meta
// before saving and never sends the token back. While connected, review
// messages are sent through the API instead of wa.me links.
export default function WhatsAppConnectCard() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/settings/whatsapp')
      .then(({ data }) => setConfig(data))
      .catch(() => setError('Could not load WhatsApp settings'));
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function connect(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put('/settings/whatsapp', form);
      setConfig(data);
      setForm(EMPTY);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect WhatsApp');
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect WhatsApp? Review messages will go back to being sent manually.')) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.delete('/settings/whatsapp');
      setConfig(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disconnect WhatsApp');
    } finally {
      setSaving(false);
    }
  }

  const connected = config && config.status !== 'unconfigured';
  const showForm = !connected || editing;

  return (
    <div className="bg-white rounded-xl shadow p-4 md:p-5 space-y-3 mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">WhatsApp Business API</p>
          <p className="text-xs text-gray-400">
            Send review messages automatically from your business number and track delivered / read status.
          </p>
        </div>
        {config?.status === 'active' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Connected</span>}
        {config?.status === 'error' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Needs reconnect</span>}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>}

      {connected && !editing && (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            <dt>Number</dt><dd className="text-gray-700">{config.displayPhoneNumber || '—'}</dd>
            <dt>Display name</dt><dd className="text-gray-700">{config.verifiedName || '—'}</dd>
            <dt>Phone number ID</dt><dd className="text-gray-700">{config.phoneNumberId}</dd>
          </dl>
          {config.status === 'error' && (
            <p className="text-xs text-red-600">
              Meta rejected the access token. Messages fall back to manual sending until you reconnect with a new token.
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={saving}>
              {config.status === 'error' ? 'Reconnect' : 'Update details'}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={disconnect} disabled={saving}>
              Disconnect
            </Button>
          </div>
        </>
      )}

      {config && showForm && (
        <form onSubmit={connect} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number ID</label>
            <input name="phoneNumberId" value={form.phoneNumberId} onChange={handleChange} required
              inputMode="numeric" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Business Account ID</label>
            <input name="wabaId" value={form.wabaId} onChange={handleChange}
              inputMode="numeric" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permanent access token</label>
            <input name="accessToken" type="password" value={form.accessToken} onChange={handleChange} required
              autoComplete="off" className="w-full border rounded px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">
              From Meta Business Settings → System users → Generate token (with whatsapp_business_messaging permission). Stored encrypted.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Checking with Meta…' : 'Connect'}</Button>
            {editing && <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </form>
      )}
    </div>
  );
}
