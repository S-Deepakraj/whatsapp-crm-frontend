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
