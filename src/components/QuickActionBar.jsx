import { buildWhatsAppLink, buildCallLink } from '../utils/whatsapp';

export default function QuickActionBar({ phone, whatsappMessage, onRequestReview, onAddVisit, onAddFollowup }) {
  const items = [
    { key: 'call',     label: 'Call',       icon: '📞', href: buildCallLink(phone) },
    { key: 'whatsapp', label: 'WhatsApp',   icon: '💬', href: buildWhatsAppLink(phone, whatsappMessage), external: true },
    { key: 'review',   label: 'Review',     icon: '⭐', onClick: onRequestReview },
    { key: 'visit',    label: 'Add Visit',  icon: '🧾', onClick: onAddVisit },
    { key: 'followup', label: 'Follow-Up',  icon: '🔔', onClick: onAddFollowup },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:static md:border md:rounded-xl md:shadow-sm">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Tag = item.href ? 'a' : 'button';
          return (
            <Tag
              key={item.key}
              type={Tag === 'button' ? 'button' : undefined}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
