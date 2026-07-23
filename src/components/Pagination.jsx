import { Button } from './ui/button';

export default function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 1}>
        ← Prev
      </Button>
      <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page === totalPages}>
        Next →
      </Button>
    </div>
  );
}
