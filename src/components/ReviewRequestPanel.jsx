import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchReviewRequest, sendReviewRequestNow, cancelReviewRequest, retryReviewRequest,
} from '../store/reviewRequestSlice';
import ReviewSendDialog from './ReviewSendDialog';
import {
  STEP_LABELS, STATUS_STYLES, EVENT_LABELS, reasonLabel, formatDateTime,
} from '../utils/reviewLabels';
import { Button } from './ui/button';

function StepLine({ label, sentAt, dueAt, skippedAt, isCurrent, active }) {
  let value;
  if (sentAt) value = <span className="text-gray-800">Sent — {formatDateTime(sentAt)}</span>;
  else if (skippedAt) value = <span className="text-gray-500">Skipped — {formatDateTime(skippedAt)}</span>;
  else if (isCurrent && active && dueAt) value = <span className="text-blue-700">Due — {formatDateTime(dueAt)}</span>;
  else value = <span className="text-gray-400">Not sent</span>;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      {value}
    </div>
  );
}

// One review campaign: step-by-step state, click status, actions and the
// event timeline. Never shows the tracking token.
export default function ReviewRequestPanel({ requestId, onChanged }) {
  const dispatch = useAppDispatch();
  const rr = useAppSelector((s) => s.reviewRequests.byId[requestId]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { dispatch(fetchReviewRequest(requestId)); }, [dispatch, requestId]);

  if (!rr) return <p className="text-sm text-gray-400">Loading review request…</p>;

  const active = rr.status === 'active';

  async function run(thunk, arg) {
    setBusy(true);
    const res = await dispatch(thunk(arg));
    setBusy(false);
    if (!res.error) {
      await dispatch(fetchReviewRequest(requestId));
      onChanged?.();
    }
    return res;
  }

  async function handleSendNow() {
    const res = await run(sendReviewRequestNow, rr.id);
    if (!res.error) setSending(true);
  }

  async function handleCancel() {
    if (window.confirm('Stop this review campaign? No further messages will be scheduled.')) {
      await run(cancelReviewRequest, rr.id);
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[rr.status]}`}>{rr.status_label}</span>
          {rr.is_overdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Overdue</span>}
        </div>
        <span className="text-xs text-gray-400">
          Order #{rr.order_id} · WhatsApp (manual)
        </span>
      </div>

      <div className="space-y-1.5">
        <StepLine label="Check-in" sentAt={rr.checkin_sent_at} dueAt={rr.checkin_due_at}
          skippedAt={rr.checkin_skipped_at} isCurrent={rr.current_step === 'checkin'} active={active} />
        <StepLine label="Review request" sentAt={rr.review_request_sent_at} dueAt={rr.review_request_due_at}
          isCurrent={rr.current_step === 'review_request'} active={active} />
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-gray-500">Review link</span>
          {rr.first_clicked_at
            ? <span className="text-green-700">Clicked — {formatDateTime(rr.first_clicked_at)}{rr.click_count > 1 ? ` (${rr.click_count}×)` : ''}</span>
            : <span className="text-gray-400">Not clicked</span>}
        </div>
        <StepLine label="Reminder" sentAt={rr.reminder_sent_at} dueAt={rr.reminder_due_at}
          skippedAt={rr.reminder_skipped_at} isCurrent={rr.current_step === 'reminder'} active={active} />
      </div>

      {(rr.status === 'failed' || rr.status === 'stopped' || rr.stop_reason) && (
        <p className="text-xs text-gray-500">
          {rr.status === 'failed'
            ? <>Failed at {STEP_LABELS[rr.failed_step]?.toLowerCase() ?? 'a step'}: {reasonLabel(rr.last_error)}</>
            : <>Reason: {reasonLabel(rr.stop_reason)}</>}
        </p>
      )}

      {active && rr.current_step && !rr.has_google_review_url && rr.current_step !== 'checkin' && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">Set your Google Review URL in Settings before sending.</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {active && rr.current_step && (
          <Button size="sm" onClick={() => setSending(true)} disabled={busy}>
            Send {STEP_LABELS[rr.current_step].toLowerCase()}
          </Button>
        )}
        {active && rr.current_step === 'checkin' && (
          <Button size="sm" variant="outline" onClick={handleSendNow} disabled={busy}>
            Send Review Request Now
          </Button>
        )}
        {rr.status === 'failed' && (
          <Button size="sm" variant="outline" onClick={() => run(retryReviewRequest, rr.id)} disabled={busy}>
            Retry
          </Button>
        )}
        {active && (
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={handleCancel} disabled={busy}>
            Stop campaign
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowTimeline((v) => !v)}>
          {showTimeline ? 'Hide timeline' : 'View timeline'}
        </Button>
      </div>

      {showTimeline && (
        <ol className="border-l-2 border-gray-200 ml-1 pl-4 space-y-2">
          {(rr.timeline ?? []).map((e) => (
            <li key={e.id} className="text-sm">
              <span className="text-gray-800">{EVENT_LABELS[e.action] ?? e.action}</span>
              {e.metadata?.reason && <span className="text-gray-500"> — {reasonLabel(e.metadata.reason)}</span>}
              {e.metadata?.dueAt && <span className="text-gray-500"> — due {formatDateTime(e.metadata.dueAt)}</span>}
              <div className="text-xs text-gray-400">{formatDateTime(e.created_at)}</div>
            </li>
          ))}
          {(rr.timeline ?? []).length === 0 && <li className="text-sm text-gray-400">No events yet.</li>}
        </ol>
      )}

      {sending && (
        <ReviewSendDialog
          request={rr}
          onClose={() => setSending(false)}
          onDone={() => onChanged?.()}
        />
      )}
    </div>
  );
}
