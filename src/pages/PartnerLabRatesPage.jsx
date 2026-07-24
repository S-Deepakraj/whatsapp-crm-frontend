import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchPartnerLabs, fetchPartnerLabRates, savePartnerLabRates } from '../store/partnerLabSlice';
import { Button } from '../components/ui/button';

const CATEGORIES = [
  { value: 'test',    label: 'Test' },
  { value: 'profile', label: 'Profile' },
  { value: 'package', label: 'Package' },
  { value: 'outlab',  label: 'Outlab' },
];

const CATEGORY_STYLES = {
  test:    'bg-blue-100 text-blue-700',
  profile: 'bg-purple-100 text-purple-700',
  package: 'bg-amber-100 text-amber-700',
  outlab:  'bg-teal-100 text-teal-700',
};

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function PartnerLabRatesPage() {
  const { id } = useParams();
  const labId = Number(id);
  const dispatch = useAppDispatch();
  const labs = useAppSelector((s) => s.partnerLabs.data);
  const lab = labs.find((l) => l.id === labId);

  const [rows, setRows] = useState([]);
  const [rateInputs, setRateInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (labs.length === 0) dispatch(fetchPartnerLabs());
  }, [dispatch, labs.length]);

  useEffect(() => {
    dispatch(fetchPartnerLabRates(labId)).then((result) => {
      if (fetchPartnerLabRates.fulfilled.match(result)) {
        setRows(result.payload);
        const inputs = {};
        result.payload.forEach((r) => {
          if (r.rate != null) inputs[r.test_catalog_id] = String(r.rate);
        });
        setRateInputs(inputs);
      }
      setLoading(false);
    });
  }, [dispatch, labId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.test_code?.toLowerCase().includes(q);
    });
  }, [rows, search, categoryFilter]);

  function updateRate(testCatalogId, value) {
    setRateInputs((prev) => ({ ...prev, [testCatalogId]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const rates = Object.entries(rateInputs)
      .filter(([, value]) => value !== '')
      .map(([testCatalogId, value]) => ({ testCatalogId: Number(testCatalogId), rate: parseFloat(value) }));

    setSaving(true);
    setError(null);
    const result = await dispatch(savePartnerLabRates({ id: labId, rates }));
    setSaving(false);
    if (savePartnerLabRates.fulfilled.match(result)) {
      setSaved(true);
    } else {
      setError(result.error?.message || 'Failed to save rates.');
    }
  }

  return (
    <div className="p-4 md:p-6">
      <Link to="/partner-labs" className="text-xs text-gray-400 hover:text-gray-600 mb-1 block">
        ← Partner Labs
      </Link>
      <h1 className="text-2xl font-bold mb-1">{lab ? `Rates for ${lab.name}` : 'Rates'}</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        Set this lab's negotiated rate per test. Leave a test blank until you've priced it for them —
        it won't fall back to MRP automatically when creating an ILS order.
      </p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="border rounded px-3 py-1.5 text-sm w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} of {rows.length}</span>
        <div className="ml-auto flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No tests match.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">MRP</th>
                <th className="px-4 py-2 font-medium">Rate for this lab</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.test_catalog_id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{r.test_code ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_STYLES[r.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {categoryLabel(r.category)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{r.mrp != null ? `₹${r.mrp}` : '—'}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={rateInputs[r.test_catalog_id] ?? ''}
                      onChange={(e) => updateRate(r.test_catalog_id, e.target.value)}
                      placeholder="Not set"
                      className="w-28 border rounded px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
