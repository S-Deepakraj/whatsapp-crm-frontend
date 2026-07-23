import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchFollowups, completeFollowup, rescheduleFollowup, deleteFollowup } from '../store/followupSlice';
import FollowupFormModal from '../components/FollowupFormModal';
import WhatsAppButton from '../components/WhatsAppButton';
import CallButton from '../components/CallButton';
import { buildFollowupMessage } from '../utils/messageBuilder';
import Pagination from '../components/Pagination';
import { Button } from '../components/ui/button';

const TABS = [
  { key: 'today',     label: 'Today' },
  { key: 'pending',   label: 'All Pending' },
  { key: 'completed', label: 'Completed' },
];

const PAGE_SIZE = 20;

const TYPE_STYLES = {
  call:           { label: 'Call',           className: 'bg-blue-100 text-blue-700' },
  whatsapp:       { label: 'WhatsApp',       className: 'bg-green-100 text-green-700' },
  review_request: { label: 'Review Request', className: 'bg-yellow-100 text-yellow-700' },
};

export default function FollowupsPage() {
  const dispatch = useAppDispatch();
  const { items, total, loading } = useAppSelector((s) => s.followups);
  const settings = useAppSelector((s) => s.settings.data);
  const [tab, setTab] = useState('today');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [newDate, setNewDate] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageParams = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  // Switching tabs starts back at page 1
  useEffect(() => { setPage(1); }, [tab]);

  useEffect(() => {
    if (tab === 'today')     dispatch(fetchFollowups({ date: today, status: 'pending', ...pageParams }));
    if (tab === 'pending')   dispatch(fetchFollowups({ status: 'pending', ...pageParams }));
    if (tab === 'completed') dispatch(fetchFollowups({ status: 'completed', ...pageParams }));
  }, [dispatch, tab, today, page]);

  function startReschedule(f) {
    setReschedulingId(f.id);
    setNewDate(f.due_date?.slice(0, 10) ?? today);
  }

  async function confirmReschedule(id) {
    if (!newDate) return;
    await dispatch(rescheduleFollowup({ id, dueDate: newDate }));
    setReschedulingId(null);
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this follow-up?')) {
      dispatch(deleteFollowup(id));
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Follow-Ups</h1>
        <Button onClick={() => setShowModal(true)}>
          + Add Follow-Up
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No follow-ups here.</p>
      ) : (
        <>
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: info */}
                <div className="space-y-1">
                  <Link
                    to={`/customers/${f.customer_id}`}
                    className="font-medium text-gray-800 hover:underline"
                  >
                    {f.customer_name}
                  </Link>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_STYLES[f.type]?.className ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_STYLES[f.type]?.label ?? f.type}
                    </span>
                    <span className="text-xs text-gray-400">{f.customer_phone}</span>
                    <span className="text-xs text-gray-400">Due: {formatDate(f.due_date)}</span>
                    {isOverdue(f) && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Overdue</span>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                {f.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                    <CallButton
                      phone={f.customer_phone}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 font-medium"
                    >
                      Call
                    </CallButton>
                    <WhatsAppButton
                      phone={f.customer_phone}
                      message={buildFollowupMessage(settings, f.customer_name)}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"
                    >
                      WhatsApp
                    </WhatsAppButton>
                    <Button
                      size="sm"
                      onClick={() => dispatch(completeFollowup(f.id))}
                      className="bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startReschedule(f)}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(f.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </Button>
                  </div>
                )}

                {f.status === 'completed' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-green-600 font-medium">✓ Done</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(f.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>

              {/* Inline reschedule */}
              {reschedulingId === f.id && (
                <div className="mt-3 flex items-center gap-2 pt-3 border-t flex-wrap">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="border rounded px-3 py-1.5 text-sm"
                  />
                  <Button size="sm" onClick={() => confirmReschedule(f.id)}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setReschedulingId(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
        </>
      )}

      {showModal && (
        <FollowupFormModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            if (tab === 'today') dispatch(fetchFollowups({ date: today, status: 'pending', ...pageParams }));
            if (tab === 'pending') dispatch(fetchFollowups({ status: 'pending', ...pageParams }));
          }}
        />
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(f) {
  if (f.status !== 'pending') return false;
  const today = new Date().toISOString().split('T')[0];
  return f.due_date?.slice(0, 10) < today;
}
