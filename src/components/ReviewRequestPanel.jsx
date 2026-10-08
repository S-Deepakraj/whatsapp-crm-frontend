import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchReviewRequest, sendReviewRequestNow, cancelReviewRequest, retryReviewRequest, markReviewReceived,
} from '../store/reviewRequestSlice';
import ReviewSendDialog from './ReviewSendDialog';
import {
  STEP_LABELS, STATUS_STYLES, MESSAGE_STATUS, MESSAGE_TYPE_STEPS, eventLabel, reasonLabel, formatDateTime,
} from '../utils/reviewLabels';
import { Button } from './ui/button';

// Delivery badge for a step sent through the WhatsApp API (manual sends
// have no delivery information, so they get none).
function MessageBadge({ message }) {
  if (!message || message.channel !== 'whatsapp_api') return null;
  const s = MESSAGE_STATUS[message.status];
  if (!s) return null;
  const at = message.read_at ?? message.delivered_at ?? message.failed_at;
  return (
    <span
      className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${s.style}`}
      title={[at && formatDateTime(at), message.error_message].filter(Boolean).join(' — ') || undefined}
    >
      {s.label}
    </span>
  );
}

function StepLine({ label, sentAt, dueAt, skippedAt, isCurrent, active, message }) {
  let value;
  if (sentAt) value = <span className="text-gray-800">Sent — {formatDateTime(sentAt)}<MessageBadge message={message} /></span>;
  else if (skippedAt) value = <span className="text-gray-500">Skipped — {formatDateTime(skippedAt)}</span>;
  else if (isCurrent && active && dueAt) value = <span className="text-blue-700">Due — {formatDateTime(dueAt)}</span>;
  else if (message?.status === 'failed' && message.channel === 'whatsapp_api') value = <span className="text-gray-400">Not sent<MessageBadge message={message} /></span>;
  else value = <span className="text-gray-400">Not sent</span>;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      {value}
    </div>
  );
}

// Latest logged message per step (messages arrive oldest first).
function latestMessages(messages = []) {
  const byStep = {};
  for (const m of messages) {
    const step = MESSAGE_TYPE_STEPS[m.message_type];
    if (step) byStep[step] = m;
  }
  return byStep;
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
  const messages = latestMessages(rr.messages);
  const lastChannel = rr.messages?.at(-1)?.channel;

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

  // A click alone doesn't mean they posted — only staff can confirm it,
  // and that's what skips the reminder.
  async function handleGotReview() {
    const msg = rr.status === 'active'
      ? `Mark that ${rr.customer_name ?? 'this customer'} posted a Google review?\n\nOnly do this after you've seen the review on Google. The campaign ends and no reminder is sent.`
      : `Mark that ${rr.customer_name ?? 'this customer'} posted a Google review?\n\nOnly do this after you've seen the review on Google.`;
    if (window.confirm(msg)) await run(markReviewReceived, rr.id);
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
          Order #{rr.order_id} · {lastChannel === 'whatsapp_api' ? 'WhatsApp API' : lastChannel === 'whatsapp_manual' ? 'WhatsApp (manual)' : 'WhatsApp'}
        </span>
      </div>

      <div className="space-y-1.5">
        <StepLine label="Check-in" sentAt={rr.checkin_sent_at} dueAt={rr.checkin_due_at}
          skippedAt={rr.checkin_skipped_at} isCurrent={rr.current_step === 'checkin'} active={active}
          message={messages.checkin} />
        <StepLine label="Review request" sentAt={rr.review_request_sent_at} dueAt={rr.review_request_due_at}
          isCurrent={rr.current_step === 'review_request'} active={active} message={messages.review_request} />
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-gray-500">Review link</span>
          {rr.first_clicked_at
            ? <span className="text-green-700">Clicked — {formatDateTime(rr.first_clicked_at)}{rr.click_count > 1 ? ` (${rr.click_count}×)` : ''}</span>
            : <span className="text-gray-400">Not clicked</span>}
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-gray-500">Google review</span>
          {rr.review_received_at
            ? <span className="text-green-700 font-medium">Received — {formatDateTime(rr.review_received_at)}</span>
            : <span className="text-gray-400">Not confirmed</span>}
        </div>
        <StepLine label="Reminder" sentAt={rr.reminder_sent_at} dueAt={rr.reminder_due_at}
          skippedAt={rr.reminder_skipped_at} isCurrent={rr.current_step === 'reminder'} active={active}
          message={messages.reminder} />
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
            Send {STEP_LABELS[rr.current_step]?.toLowerCase() ?? 'message'}
          </Button>
        )}
        {active && rr.current_step === 'checkin' && (
          <Button size="sm" variant="outline" onClick={handleSendNow} disabled={busy}>
            Send Review Request Now
          </Button>
        )}
        {rr.review_request_sent_at && !rr.review_received_at && (
          <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
            onClick={handleGotReview} disabled={busy}>
            ✓ Got review
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
              <span className="text-gray-800">{eventLabel(e)}</span>
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
