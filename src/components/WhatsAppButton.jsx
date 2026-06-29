import { buildWhatsAppLink } from '../utils/whatsapp';

export default function WhatsAppButton({ phone, message, className = '', children }) {
  if (!phone) return null;
  return (
    <a
      href={buildWhatsAppLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children ?? 'WhatsApp'}
    </a>
  );
}
