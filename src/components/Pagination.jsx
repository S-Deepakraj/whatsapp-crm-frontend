export default function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={onPrev} disabled={page === 1}
        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
      <button
        onClick={onNext} disabled={page === totalPages}
        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}
