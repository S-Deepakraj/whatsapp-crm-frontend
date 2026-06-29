import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCustomer, deleteCustomer } from '../store/customerSlice';
import { fetchVisits, deleteVisit }      from '../store/visitSlice';
import { fetchFollowups, completeFollowup } from '../store/followupSlice';
import FollowupFormModal from '../components/FollowupFormModal';
import VisitFormModal    from '../components/VisitFormModal';
import QuickActionBar    from '../components/QuickActionBar';
import Pagination        from '../components/Pagination';
import { buildFollowupMessage, buildReviewMessage } from '../utils/messageBuilder';
import { buildWhatsAppLink } from '../utils/whatsapp';
import api from '../services/api';

const PAGE_SIZE = 5;

const ACTION_LABELS = {
  CUSTOMER_CREATED:     'Customer added',
  CUSTOMER_UPDATED:     'Customer updated',
  VISIT_CREATED:        'Visit logged',
  VISIT_UPDATED:        'Visit updated',
  VISIT_DELETED:        'Visit deleted',
  FOLLOWUP_CREATED:     'Follow-up created',
  FOLLOWUP_COMPLETED:   'Follow-up completed',
  FOLLOWUP_RESCHEDULED: 'Follow-up rescheduled',
  REVIEW_REQUESTED:     'Review requested',
};

const ACTION_COLORS = {
  CUSTOMER_CREATED:     'bg-blue-100 text-blue-700',
  CUSTOMER_UPDATED:     'bg-gray-100 text-gray-600',
  VISIT_CREATED:        'bg-green-100 text-green-700',
  VISIT_UPDATED:        'bg-green-100 text-green-600',
  VISIT_DELETED:        'bg-red-100 text-red-600',
  FOLLOWUP_CREATED:     'bg-yellow-100 text-yellow-700',
  FOLLOWUP_COMPLETED:   'bg-purple-100 text-purple-700',
  FOLLOWUP_RESCHEDULED: 'bg-orange-100 text-orange-700',
  REVIEW_REQUESTED:     'bg-pink-100 text-pink-700',
};

// ─── helpers ────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

// ─── sub-components ─────────────────────────────────────────

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function VisitRow({ visit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-800 w-28 shrink-0">{fmt(visit.visit_date)}</span>
          <span className="text-sm text-gray-500 truncate max-w-xs">
            {visit.items?.map((i) => i.serviceName).join(', ') || '—'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-green-700">
            ₹{parseFloat(visit.total_amount).toLocaleString('en-IN')}
          </span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b">
                <th className="pb-1">Service</th>
                <th className="pb-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visit.items?.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 text-gray-700">{item.serviceName}</td>
                  <td className="py-1.5 text-right text-gray-700">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visit.notes && <p className="text-xs text-gray-500 mb-3">Note: {visit.notes}</p>}
          <button
            onClick={() => onDelete(visit.id)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete visit
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-sm text-gray-400 text-center py-10">{message}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────

export default function CustomerProfilePage() {
  const { id } = useParams();
  const customerId = Number(id);
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();

  const customer  = useAppSelector((s) => s.customers.selected);
  const settings  = useAppSelector((s) => s.settings.data);
  const { data: visits, total: totalVisits, loading: visitsLoading } = useAppSelector((s) => s.visits);
  const { items: followups, loading: followupsLoading } = useAppSelector((s) => s.followups);

  const [summary,   setSummary]   = useState(null);
  const [activity,  setActivity]  = useState([]);
  const [related,   setRelated]   = useState([]);
  const [tab,       setTab]       = useState('visits');
  const [page,      setPage]      = useState(1);
  const [confirmDelete, setConfirmDelete]    = useState(false);
  const [deleting,      setDeleting]         = useState(false);
  const [showFollowup,  setShowFollowup]     = useState(false);
  const [showVisit,     setShowVisit]        = useState(false);

  const totalPages = Math.ceil(totalVisits / PAGE_SIZE);

  // Load customer
  useEffect(() => { dispatch(fetchCustomer(customerId)); }, [dispatch, customerId]);

  // Load visits (paginates)
  useEffect(() => {
    dispatch(fetchVisits({ customerId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }));
  }, [dispatch, customerId, page]);

  // Load followups for this customer
  useEffect(() => {
    dispatch(fetchFollowups({ customerId }));
  }, [dispatch, customerId]);

  // Load summary + activity (local state — not needed in global store)
  useEffect(() => {
    api.get(`/customers/${customerId}/summary`).then((r) => setSummary(r.data));
    api.get(`/customers/${customerId}/activity`).then((r) => setActivity(r.data));
  }, [customerId]);

  // Find other customers sharing this phone number (e.g. family members)
  useEffect(() => {
    if (!customer?.phone) return;
    api.get('/customers/check-phone', { params: { phone: customer.phone, excludeId: customerId } })
      .then((r) => setRelated(r.data));
  }, [customer?.phone, customerId]);

  async function handleDeleteVisit(visitId) {
    if (!window.confirm('Delete this visit?')) return;
    await dispatch(deleteVisit(visitId));
    // Refresh summary after deletion
    api.get(`/customers/${customerId}/summary`).then((r) => setSummary(r.data));
  }

  async function handleDeleteCustomer() {
    setDeleting(true);
    await dispatch(deleteCustomer(customerId));
    navigate('/customers');
  }

  async function handleRequestReview() {
    const message = buildReviewMessage(settings, customer.name);
    window.open(buildWhatsAppLink(customer.phone, message), '_blank', 'noopener,noreferrer');
    await api.post('/reviews', { customerId });
    api.get(`/customers/${customerId}/activity`).then((r) => setActivity(r.data));
  }

  if (!customer || customer.id !== customerId) {
    return <div className="p-6 animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="h-4 bg-gray-100 rounded w-32" />
    </div>;
  }

  const whatsappMessage = buildFollowupMessage(settings, customer.name);

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6 pb-24 md:pb-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/customers" className="text-xs text-gray-400 hover:text-gray-600 mb-1 block">
            ← Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {customer.phone}
            {customer.email && <span> · {customer.email}</span>}
          </p>
          {customer.tags?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {customer.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/customers/${id}/edit`} className="text-sm border px-3 py-2 rounded hover:bg-gray-50">
            Edit
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm border border-red-200 text-red-500 px-3 py-2 rounded hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ── Quick Action Bar ── */}
      <QuickActionBar
        phone={customer.phone}
        whatsappMessage={whatsappMessage}
        onRequestReview={handleRequestReview}
        onAddVisit={() => setShowVisit(true)}
        onAddFollowup={() => setShowFollowup(true)}
      />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Total Visits"
          value={summary ? summary.totalVisits : '—'}
          color="text-blue-600"
        />
        <SummaryCard
          label="Total Revenue"
          value={summary ? `₹${Number(summary.totalRevenue).toLocaleString('en-IN')}` : '—'}
          color="text-green-600"
        />
        <SummaryCard
          label="Pending Follow-Ups"
          value={summary ? summary.pendingFollowups : '—'}
          color={summary?.pendingFollowups > 0 ? 'text-yellow-600' : 'text-gray-500'}
        />
        <SummaryCard
          label="Last Visit"
          value={summary?.lastVisitDate ? fmt(summary.lastVisitDate) : '—'}
          sub={summary?.lastVisitDate ? timeAgo(summary.lastVisitDate) : null}
          color="text-purple-600"
        />
        <SummaryCard
          label="Last Follow-Up"
          value={summary?.lastFollowup ? capitalize(summary.lastFollowup.type) : '—'}
          sub={summary?.lastFollowup ? `${fmt(summary.lastFollowup.due_date)} · ${summary.lastFollowup.status}` : null}
          color="text-orange-600"
        />
      </div>

      {/* ── Notes ── */}
      {customer.notes && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-yellow-700 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{customer.notes}</p>
        </div>
      )}

      {/* ── Related contacts (same phone number) ── */}
      {related.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-blue-700 mb-2">Also reachable on this number</p>
          <div className="flex gap-2 flex-wrap">
            {related.map((c) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="text-sm bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
          {[
            { key: 'visits',   label: 'Visit History' },
            { key: 'followups', label: 'Follow-Ups' },
            { key: 'activity', label: 'Activity' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Visit History */}
        {tab === 'visits' && (
          <div className="space-y-3">
            {visitsLoading ? <Skeleton /> : visits.length === 0
              ? <EmptyState message="No visits recorded yet." />
              : <>
                  {visits.map((v) => (
                    <VisitRow key={v.id} visit={v} onDelete={handleDeleteVisit} />
                  ))}
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPrev={() => setPage((p) => p - 1)}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
            }
          </div>
        )}

        {/* Follow-Up History */}
        {tab === 'followups' && (
          <div className="space-y-3">
            {followupsLoading ? <Skeleton /> : followups.length === 0
              ? <EmptyState message="No follow-ups for this customer." />
              : followups.map((f) => (
                  <div key={f.id} className="bg-white border rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium mr-2 ${
                        f.status === 'completed' ? 'bg-green-100 text-green-700' :
                        f.status === 'missed'    ? 'bg-red-100 text-red-600' :
                                                   'bg-yellow-100 text-yellow-700'
                      }`}>
                        {f.status}
                      </span>
                      <span className="text-sm text-gray-700 capitalize">{f.type.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400 ml-2">Due: {fmt(f.due_date)}</span>
                    </div>
                    {f.status === 'pending' && (
                      <button
                        onClick={() => dispatch(completeFollowup(f.id))}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                ))
            }
          </div>
        )}

        {/* Activity Timeline */}
        {tab === 'activity' && (
          <div>
            {activity.length === 0
              ? <EmptyState message="No activity recorded yet." />
              : (
                <div className="relative pl-4">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" />
                  <ul className="space-y-5">
                    {activity.map((log) => (
                      <li key={log.id} className="relative">
                        <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                        <div className="flex items-start gap-3 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                          <span className="text-xs text-gray-400">
                            {fmt(log.created_at)} · {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 ml-0.5">
                            {formatMetadata(log.action, log.metadata)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            }
          </div>
        )}
      </div>

      {/* ── Visit Modal ── */}
      {showVisit && (
        <VisitFormModal
          customerId={customerId}
          onClose={() => setShowVisit(false)}
          onCreated={() => {
            dispatch(fetchVisits({ customerId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }));
            api.get(`/customers/${customerId}/summary`).then((r) => setSummary(r.data));
            api.get(`/customers/${customerId}/activity`).then((r) => setActivity(r.data));
            setTab('visits');
          }}
        />
      )}

      {/* ── Follow-up Modal ── */}
      {showFollowup && (
        <FollowupFormModal
          customerId={customerId}
          customerName={customer.name}
          onClose={() => setShowFollowup(false)}
          onCreated={() => {
            dispatch(fetchFollowups({ customerId }));
            api.get(`/customers/${customerId}/summary`).then((r) => setSummary(r.data));
          }}
        />
      )}

      {/* ── Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete customer?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete <strong>{customer.name}</strong> along with all visits, follow-ups and reviews.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCustomer} disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMetadata(action, meta) {
  switch (action) {
    case 'VISIT_CREATED':
    case 'VISIT_UPDATED':
      return `₹${Number(meta.totalAmount ?? 0).toLocaleString('en-IN')} · ${meta.itemCount ?? ''} service${meta.itemCount !== 1 ? 's' : ''}`;
    case 'VISIT_DELETED':
      return `₹${Number(meta.totalAmount ?? 0).toLocaleString('en-IN')} on ${fmt(meta.visitDate)}`;
    case 'FOLLOWUP_RESCHEDULED':
      return `${fmt(meta.oldDueDate)} → ${fmt(meta.newDueDate)}`;
    case 'FOLLOWUP_CREATED':
      return `${(meta.type ?? '').replace('_', ' ')} · due ${fmt(meta.dueDate)}`;
    case 'REVIEW_REQUESTED':
      return 'Sent via WhatsApp';
    default:
      return null;
  }
}
