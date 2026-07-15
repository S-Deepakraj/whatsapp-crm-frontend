import { renderTemplate } from './whatsapp';

const DEFAULTS = {
  followupTemplate: 'Hi {{name}}, just checking in! Hope everything is going well.',
  reviewTemplate:   'Hi {{name}}, thank you for visiting {{businessName}}! We would love a quick review:',
  thankyouTemplate: 'Thank you {{name}} for visiting {{businessName}}!',
};

function vars(settings, customerName) {
  return { name: customerName, businessName: settings?.businessName ?? '' };
}

export function buildFollowupMessage(settings, customerName) {
  return renderTemplate(settings?.followupTemplate || DEFAULTS.followupTemplate, vars(settings, customerName));
}

export function buildReviewMessage(settings, customerName) {
  const base = renderTemplate(settings?.reviewTemplate || DEFAULTS.reviewTemplate, vars(settings, customerName));
  return settings?.googleReviewUrl ? `${base} ${settings.googleReviewUrl}` : base;
}

export function buildThankYouMessage(settings, customerName) {
  return renderTemplate(settings?.thankyouTemplate || DEFAULTS.thankyouTemplate, vars(settings, customerName));
}

function formatOrderTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatOrderDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function buildOrderConfirmationMessage(settings, order) {
  const businessName = settings?.businessName || 'us';
  const tests = order.test_lines.map((l) => l.testName).join(', ');
  return `Hi ${order.customer_name}, your home collection with ${businessName} is *confirmed*.\n\n`
    + `*Date:* ${formatOrderDate(order.scheduled_date)}\n`
    + `*Time:* ${formatOrderTime(order.slot_start)} – ${formatOrderTime(order.slot_end)}\n`
    + `*Address:* ${order.collection_address}\n`
    + `*Tests:* ${tests}\n\n`
    + `Our technician will reach you at the scheduled time. Thank you!`;
}

export function buildOrderReminderMessage(settings, order) {
  const businessName = settings?.businessName || 'us';
  const tests = order.test_lines.map((l) => l.testName).join(', ');
  return `Hi ${order.customer_name}, this is a reminder from ${businessName} for your home collection *today*.\n\n`
    + `*Time:* ${formatOrderTime(order.slot_start)} – ${formatOrderTime(order.slot_end)}\n`
    + `*Address:* ${order.collection_address}\n`
    + `*Tests:* ${tests}\n\n`
    + `Please be available at the address. Thank you!`;
}

export function buildOrderReportMessage(settings, order, reportUrl) {
  const businessName = settings?.businessName || 'us';
  return `Hi ${order.customer_name}, your report from ${businessName} is ready.\n\n`
    + `Download here: ${reportUrl}\n\n`
    + `Thank you for choosing us!`;
}
