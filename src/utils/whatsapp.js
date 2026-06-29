export function renderTemplate(template, vars = {}) {
  return (template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export function buildWhatsAppLink(phone, message) {
  const normalized = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildCallLink(phone) {
  return `tel:${(phone || '').replace(/\s+/g, '')}`;
}
