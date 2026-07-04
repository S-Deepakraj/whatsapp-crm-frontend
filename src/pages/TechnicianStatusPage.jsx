import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const STATUS_LABEL = {
  confirmed:    'Confirmed',
  assigned:     'Assigned to you',
  reached:      'Marked as reached',
  collected:    'Sample collected',
  issue:        'Issue reported',
  report_ready: 'Report ready',
  closed:       'Closed',
  cancelled:    'Cancelled',
};

// Mirrors TECHNICIAN_TRANSITIONS in backend order.service.js — kept in
// sync manually since this page has no auth to fetch it from a shared source.
const NEXT_ACTIONS = {
  assigned: [
    { status: 'reached',   label: "I've Reached" },
    { status: 'issue',     label: 'Report an Issue' },
  ],
  reached: [
    { status: 'collected', label: 'Sample Collected' },
    { status: 'issue',     label: 'Report an Issue' },
  ],
};

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TechnicianStatusPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueNote, setIssueNote] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/public/orders/${token}`)
      .then((r) => setOrder(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function submitStatus(status, note) {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.patch(`/public/orders/${token}/status`, { status, note });
      setOrder(data);
      setShowIssueForm(false);
      setIssueNote('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (notFound || !order) {
    return <CenteredMessage>Link not found or no longer valid.</CenteredMessage>;
  }

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border p-5 mt-6">
          <p className="text-xs text-gray-400 mb-1">Home Collection</p>
          <h1 className="text-lg font-semibold mb-3">{order.customer_name}</h1>

          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p>{formatDate(order.scheduled_date)} · {formatTime(order.slot_start)}–{formatTime(order.slot_end)}</p>
            <p>{order.collection_address}</p>
            <p>{order.test_lines.map((l) => l.testName).join(', ')}</p>
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
            <span className="text-xs text-gray-500">Status: </span>
            <span className="text-sm font-medium">{STATUS_LABEL[order.status] ?? order.status}</span>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {showIssueForm ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                What happened? <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="e.g. customer not home, wrong address…"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => submitStatus('issue', issueNote)}
                  disabled={submitting}
                  className="flex-1 bg-red-500 text-white py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Submit Issue'}
                </button>
                <button
                  onClick={() => setShowIssueForm(false)}
                  className="flex-1 border py-2 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : actions.length > 0 ? (
            <div className="space-y-2">
              {actions.map((a) => (
                <button
                  key={a.status}
                  onClick={() => (a.status === 'issue' ? setShowIssueForm(true) : submitStatus(a.status))}
                  disabled={submitting}
                  className={`w-full py-2.5 rounded text-sm font-medium disabled:opacity-50 ${
                    a.status === 'issue'
                      ? 'border border-red-300 text-red-500'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {submitting ? 'Updating…' : a.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">Nothing more to update here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <p className="text-gray-400 text-sm">{children}</p>
    </div>
  );
}
