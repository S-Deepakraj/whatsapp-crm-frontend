// Shared wording for the Google review campaign UI. Deliberately says
// "link clicked", never "reviewed" — a click is all we can observe.

export const STEP_LABELS = {
  checkin: 'Check-in',
  review_request: 'Review request',
  reminder: 'Reminder',
};

export const FAILURE_REASONS = [
  { value: 'no_whatsapp', label: 'Not on WhatsApp' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'other', label: 'Other' },
];

export const STATUS_STYLES = {
  active:    'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  stopped:   'bg-gray-100 text-gray-600',
  failed:    'bg-red-100 text-red-700',
};

export const EVENT_LABELS = {
  REVIEW_CAMPAIGN_CREATED:   'Campaign created (report delivered)',
  REVIEW_CAMPAIGN_SKIPPED:   'Campaign not started',
  REVIEW_CHECKIN_SCHEDULED:  'Check-in scheduled',
  REVIEW_CHECKIN_SENT:       'Check-in sent (confirmed by staff)',
  REVIEW_CHECKIN_SKIPPED:    'Check-in skipped',
  REVIEW_REQUEST_SCHEDULED:  'Review request scheduled',
  REVIEW_REQUEST_SENT:       'Review request sent (confirmed by staff)',
  REVIEW_LINK_CLICKED:       'Review link clicked',
  REVIEW_LINK_ERROR:         'Review link opened but Google URL missing',
  REVIEW_REMINDER_SCHEDULED: 'Reminder scheduled',
  REVIEW_REMINDER_SENT:      'Reminder sent (confirmed by staff)',
  REVIEW_REMINDER_SKIPPED:   'Reminder skipped',
  REVIEW_CAMPAIGN_COMPLETED: 'Campaign completed',
  REVIEW_CAMPAIGN_STOPPED:   'Campaign stopped',
  REVIEW_CAMPAIGN_FAILED:    'Campaign failed',
  REVIEW_CAMPAIGN_RETRIED:   'Campaign retried',
  REVIEW_MESSAGE_DELIVERED:  'Message delivered',
  REVIEW_MESSAGE_READ:       'Message read',
  REVIEW_MESSAGE_FAILED:     'Message not delivered',
};

// "Sent" events carry metadata.channel: an API send isn't a staff confirmation.
export function eventLabel(event) {
  const label = EVENT_LABELS[event.action] ?? event.action;
  if (event.metadata?.channel === 'whatsapp_api') return label.replace('(confirmed by staff)', '(via WhatsApp API)');
  if (event.metadata?.step && event.action.startsWith('REVIEW_MESSAGE_')) {
    return `${STEP_LABELS[event.metadata.step] ?? event.metadata.step}: ${label.toLowerCase()}`;
  }
  return label;
}

// whatsapp_messages.status → badge
export const MESSAGE_STATUS = {
  manual:    { label: 'Sent manually', style: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Sent',          style: 'bg-gray-100 text-gray-700' },
  delivered: { label: 'Delivered',     style: 'bg-blue-100 text-blue-700' },
  read:      { label: 'Read',          style: 'bg-green-100 text-green-700' },
  failed:    { label: 'Not delivered', style: 'bg-red-100 text-red-700' },
};

// whatsapp_messages.message_type → campaign step
export const MESSAGE_TYPE_STEPS = {
  review_checkin: 'checkin',
  review_request: 'review_request',
  review_reminder: 'reminder',
};

const REASON_LABELS = {
  invalid_phone: 'invalid phone number',
  no_whatsapp: 'not on WhatsApp',
  wrong_number: 'wrong number',
  order_cancelled: 'order cancelled',
  customer_deleted: 'customer deleted',
  cancelled_by_staff: 'cancelled by staff',
  expired: 'review request not sent within 7 days',
  not_sent_in_time: 'not sent within 24h',
  send_now: 'review request sent early',
  clicked_before_reminder: 'customer already clicked the link',
  reminder_window_passed: 'reminder not sent in time',
  reminder_sent: 'reminder sent',
  customer_has_active_campaign: 'customer already has an active campaign',
  missing_google_review_url: 'Google review URL not set',
  whatsapp_undelivered: 'WhatsApp could not deliver it',
};

export function reasonLabel(reason) {
  if (!reason) return '';
  const [code, ...rest] = String(reason).split(': ');
  const label = REASON_LABELS[code] ?? code.replace(/_/g, ' ');
  return rest.length ? `${label} — ${rest.join(': ')}` : label;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}
