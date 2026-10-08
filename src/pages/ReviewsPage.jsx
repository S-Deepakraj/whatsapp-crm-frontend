import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchReviewRequests, fetchReviewStats, reviewListKey } from '../store/reviewRequestSlice';
import ReviewSendDialog from '../components/ReviewSendDialog';
import ReviewRequestPanel from '../components/ReviewRequestPanel';
import Pagination from '../components/Pagination';
import { Button } from '../components/ui/button';
import { STEP_LABELS, STATUS_STYLES, formatDateTime } from '../utils/reviewLabels';

const PAGE_SIZE = 20;

const TABS = [
  { key: 'due', label: 'Due now' },
  { key: 'all', label: 'All requests' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'failed', label: 'Failed' },
];

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl p-4 bg-white border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{value ?? '—'}</div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function ReviewsPage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, stats, itemsQuery } = useAppSelector((s) => s.reviewRequests);
  const settings = useAppSelector((s) => s.settings.data);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sendTarget, setSendTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const tab = searchParams.get('tab') || 'due';
  const status = searchParams.get('status') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const page = Number(searchParams.get('page') || 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function setParam(updates) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in updates)) next.delete('page');
    setSearchParams(next, { replace: true });
  }

  const listParams = useMemo(() => (tab === 'due'
    ? { due: 1, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
    : { status: status || undefined, from: from || undefined, to: to || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
  ), [tab, status, from, to, page]);

  const reload = useCallback(() => {
    dispatch(fetchReviewStats({ from: from || undefined, to: to || undefined }));
    dispatch(fetchReviewRequests(listParams));
  }, [dispatch, listParams, from, to]);

  useEffect(() => { reload(); }, [reload]);

  // Rows in the store may belong to another view (e.g. All requests,
  // where completed rows have no current step) until this view's fetch
  // lands — never render those.
  const listReady = itemsQuery === reviewListKey(listParams);

  const automationOff = settings && settings.reviewAutomationEnabled === false;
  const missingUrl = settings && !settings.googleReviewUrl;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Google Reviews</h1>
          <p className="text-sm text-gray-500">Check-in → review request → one reminder, after each report is delivered.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={from} onChange={(e) => setParam({ from: e.target.value })}
            className="border rounded px-2 py-1.5" aria-label="From date" />
          <span className="text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setParam({ to: e.target.value })}
            className="border rounded px-2 py-1.5" aria-label="To date" />
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => setParam({ from: '', to: '' })}>Clear</Button>}
        </div>
      </div>

      {(automationOff || missingUrl) && (
        <div className="mb-4 text-sm bg-amber-50 text-amber-800 rounded-lg p-3">
          {automationOff && <p>Review automation is paused — nothing is shown as due and no new campaigns start.</p>}
          {missingUrl && <p>Google Review URL is not set — review requests can't be sent yet.</p>}
          <Link to="/settings" className="underline font-medium">Open Settings</Link>
        </div>
      )}

      {/* Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-2">
        <StatTile label="Eligible customers" value={stats?.eligible} hint="reports delivered" />
        <StatTile label="Review requests sent" value={stats?.requests_sent} />
        <StatTile label="Delivered" value="—" hint="not tracked (manual WhatsApp)" />
        <StatTile label="Review link clicks" value={stats?.clicked} hint="unique requests" />
        <StatTile label="Click rate" value={stats?.click_rate == null ? '—' : `${stats.click_rate}%`} hint="clicks ÷ requests sent" />
        <StatTile label="Reminders sent" value={stats?.reminders_sent} hint={stats ? `${stats.reminder_clicks} clicked after reminder` : undefined} />
        <StatTile label="Reviews received" value={stats?.reviews_received} hint="confirmed by staff (Got review)" />
      </div>
      <p className="text-xs text-gray-400 mb-5">
        {stats && <>Check-ins sent {stats.checkins_sent} · Active {stats.active} · Completed {stats.completed} · Stopped {stats.stopped} · Failed {stats.failed}. </>}
        A click only means the customer opened the Google review page — it doesn't skip the reminder. Use "Got review" once you see their review on Google.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParam({ tab: t.key === 'due' ? '' : t.key, status: '' })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}{t.key === 'due' && stats?.due_now ? ` (${stats.due_now})` : ''}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="mb-4">
          <select value={status} onChange={(e) => setParam({ status: e.target.value })}
            className="border rounded px-3 py-1.5 text-sm">
            {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {loading || !listReady ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center bg-white rounded-xl border">
          {tab === 'due' ? 'Nothing to send right now.' : 'No review requests yet. Mark a report delivered on an order to start one.'}
        </p>
      ) : tab === 'due' ? (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <Link to={`/customers/${r.customer_id}`} className="font-medium text-gray-800 hover:underline">
                  {r.customer_name}
                </Link>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{STEP_LABELS[r.current_step]}</span>
                  <span className="text-gray-400">Order #{r.order_id}</span>
                  <span className="text-gray-400">Due {formatDateTime(r.next_action_at)}</span>
                  {r.is_overdue && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Overdue</span>}
                  {r.current_step !== 'checkin' && !r.has_google_review_url && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Google URL missing</span>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => setSendTarget(r)}>Send {STEP_LABELS[r.current_step]?.toLowerCase() ?? 'message'}</Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Customer', 'Order', 'Channel', 'Status', 'Sent', 'Clicked', 'Reminder', 'Review', 'Created'].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{r.customer_name ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">#{r.order_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">WhatsApp</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[r.status]}`}>{r.status_label}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.review_request_sent_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.first_clicked_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.reminder_sent_at ? formatDateTime(r.reminder_sent_at) : r.reminder_skipped_at ? 'Skipped' : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.review_received_at ? <span className="text-green-700 font-medium">✓ Received</span> : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan={9} className="p-3">
                        <ReviewRequestPanel requestId={r.id} onChanged={reload} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setParam({ page: String(page - 1) })}
          onNext={() => setParam({ page: String(page + 1) })}
        />
      </div>

      {sendTarget && (
        <ReviewSendDialog request={sendTarget} onClose={() => setSendTarget(null)} onDone={reload} />
      )}
    </div>
  );
}
