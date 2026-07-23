import { buildCallLink } from '../utils/whatsapp';
import { Button } from './ui/button';

export default function CallButton({ phone, className = '', variant = 'ghost', size = 'sm', children }) {
  if (!phone) return null;
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={buildCallLink(phone)}
        onClick={(e) => e.stopPropagation()}
      >
        {children ?? 'Call'}
      </a>
    </Button>
  );
}
