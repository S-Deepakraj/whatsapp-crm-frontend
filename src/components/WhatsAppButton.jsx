import { buildWhatsAppLink } from '../utils/whatsapp';
import { Button } from './ui/button';

export default function WhatsAppButton({ phone, message, className = '', variant = 'ghost', size = 'sm', children }) {
  if (!phone) return null;
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={buildWhatsAppLink(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {children ?? 'WhatsApp'}
      </a>
    </Button>
  );
}
