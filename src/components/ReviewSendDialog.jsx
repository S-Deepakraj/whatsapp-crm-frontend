import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { prepareReviewStep, confirmReviewStep, sendReviewStep } from '../store/reviewRequestSlice';
import { STEP_LABELS, FAILURE_REASONS } from '../utils/reviewLabels';
import { Button } from './ui/button';

// Sends one campaign step. With WhatsApp connected (prepared.mode 'api')
// it's one click: the backend sends the approved template and
// delivered/read arrive later by webhook. Otherwise the manual flow:
//   1. backend renders the exact message + wa.me link (nothing marked yet)
//   2. staff open WhatsApp and send it themselves
//   3. staff confirm "Sent" or "Couldn't send" — that's what gets recorded.
// We never mark a manual message delivered: opening wa.me proves nothing.
export default function ReviewSendDialog({ request, onClose, onDone }) {
  const dispatch = useAppDispatch();
  const step = request.current_step;
  const [forceManual, setForceManual] = useState(false);
  const [prepared, setPrepared] = useState(null);
  const [error, setError] = useState(null);
  const [opened, setOpened] = useState(false);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('no_whatsapp');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPrepared(null);
    setError(null);
    const channel = forceManual ? 'whatsapp_manual' : undefined;
    dispatch(prepareReviewStep({ id: request.id, step, channel })).then((res) => {
      if (prepareReviewStep.fulfilled.match(res)) setPrepared(res.payload);
      else setError(res.payload);
    });
  }, [dispatch, request.id, step, forceManual]);

  async function sendViaApi() {
    setSaving(true);
    setError(null);
    const res = await dispatch(sendReviewStep({ id: request.id, step }));
    setSaving(false);
    if (sendReviewStep.fulfilled.match(res)) {
      onDone?.(res.payload);
      onClose();
    } else {
      setError(res.payload);
    }
  }

  function openWhatsApp() {
    window.open(prepared.url, '_blank', 'noopener');
    setOpened(true);
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(prepared.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function confirm(outcome) {
    setSaving(true);
    const res = await dispatch(confirmReviewStep({
      id: request.id, step, outcome,
      ...(outcome === 'failed' ? { reason, note: note || undefined } : {}),
    }));
    setSaving(false);
    if (confirmReviewStep.fulfilled.match(res)) {
      onDone?.(res.payload);
      onClose();
    } else {
      setError(res.payload);
    }
  }

  const needsSettings = error && /Settings/.test(error);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">Send {STEP_LABELS[step]?.toLowerCase()}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {request.customer_name} · {request.customer_phone}
        </p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">
            {error}
            {needsSettings && (
              <> <Link to="/settings" className="underline font-medium" onClick={onClose}>Open Settings</Link></>
            )}
          </div>
        )}

        {!prepared && !error && <p className="text-sm text-gray-500">Preparing message…</p>}

        {prepared?.mode === 'api' && (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-50 border rounded-lg p-3 mb-2">{prepared.text}</pre>
            <p className="text-xs text-gray-500 mb-4">
              Sent from {prepared.from || 'your WhatsApp number'} using the approved template{' '}
              <code className="bg-gray-100 px-1 rounded">{prepared.template}</code>. Delivery and read status update automatically.
            </p>
            <Button onClick={sendViaApi} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
              {saving ? 'Sending…' : 'Send via WhatsApp'}
            </Button>
            <button
              type="button"
              onClick={() => setForceManual(true)}
              disabled={saving}
              className="mt-3 text-xs text-gray-500 underline"
            >
              Send manually instead
            </button>
          </>
        )}

        {prepared?.mode === 'manual' && (
          <>
            {prepared.apiAvailable && (
              <button
                type="button"
                onClick={() => setForceManual(false)}
                className="mb-3 text-xs text-gray-500 underline"
              >
                Back to sending via WhatsApp API
              </button>
            )}
            <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-50 border rounded-lg p-3 mb-4">{prepared.text}</pre>

            <div className="flex gap-2 mb-5">
              <Button onClick={openWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                Open WhatsApp
              </Button>
              <Button variant="outline" onClick={copyMessage}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Did you send it?</p>
              <p className="text-xs text-gray-500 mb-3">
                {opened
                  ? 'Confirm only after you have pressed send in WhatsApp.'
                  : 'Open WhatsApp, send the message, then confirm here.'}
              </p>

              {!failing ? (
                <div className="flex gap-2">
                  <Button onClick={() => confirm('sent')} disabled={saving} className="flex-1">
                    {saving ? 'Saving…' : 'Yes, sent'}
                  </Button>
                  <Button variant="outline" onClick={() => setFailing(true)} disabled={saving} className="flex-1">
                    Couldn't send
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {FAILURE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={300}
                    placeholder="Note (optional)"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => confirm('failed')} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700">
                      {saving ? 'Saving…' : 'Mark as failed'}
                    </Button>
                    <Button variant="outline" onClick={() => setFailing(false)} disabled={saving}>Back</Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-4 text-right">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
