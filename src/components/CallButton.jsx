import { buildCallLink } from '../utils/whatsapp';

export default function CallButton({ phone, className = '', children }) {
  if (!phone) return null;
  return (
    <a
      href={buildCallLink(phone)}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children ?? 'Call'}
    </a>
  );
}
