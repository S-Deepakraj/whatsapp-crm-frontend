import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOutsourceLabs, fetchOutsourceLabRates, saveOutsourceLabRates } from '../store/outsourceSlice';
import { Button } from '../components/ui/button';

export default function OutsourceLabRatesPage() {
  const { id } = useParams();
  const labId = Number(id);
  const dispatch = useAppDispatch();
  const labs = useAppSelector((s) => s.outsource.labs);
  const lab = labs.find((l) => l.id === labId);

  const [rows, setRows] = useState([]);
  // What's saved vs. what's being edited — a rate cleared from a
  // previously-set value has to be sent as null (lab stopped offering it),
  // not just dropped from the request.
  const [savedCosts, setSavedCosts] = useState({});
  const [costInputs, setCostInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (labs.length === 0) dispatch(fetchOutsourceLabs({ includeInactive: true }));
  }, [dispatch, labs.length]);

  useEffect(() => {
    dispatch(fetchOutsourceLabRates(labId)).then((result) => {
      if (fetchOutsourceLabRates.fulfilled.match(result)) {
        setRows(result.payload);
        const inputs = {};
        result.payload.forEach((r) => {
          if (r.cost != null) inputs[r.outsource_test_id] = String(r.cost);
        });
        setCostInputs(inputs);
        setSavedCosts(inputs);
      }
      setLoading(false);
    });
  }, [dispatch, labId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.test_code?.toLowerCase().includes(q));
  }, [rows, search]);

  function updateCost(testId, value) {
    setCostInputs((prev) => ({ ...prev, [testId]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const ids = new Set([...Object.keys(costInputs), ...Object.keys(savedCosts)]);
    const rates = [...ids]
      .filter((testId) => (costInputs[testId] ?? '') !== (savedCosts[testId] ?? ''))
      .map((testId) => ({
        outsourceTestId: Number(testId),
        cost: (costInputs[testId] ?? '') === '' ? null : parseFloat(costInputs[testId]),
      }));

    setSaving(true);
    setError(null);
    const result = await dispatch(saveOutsourceLabRates({ id: labId, rates }));
    setSaving(false);
    if (saveOutsourceLabRates.fulfilled.match(result)) {
      const next = {};
      Object.entries(costInputs).forEach(([testId, value]) => { if (value !== '') next[testId] = value; });
      setSavedCosts(next);
      setCostInputs(next);
      setSaved(true);
    } else {
      setError(result.error?.message || 'Failed to save rates.');
    }
  }

  return (
    <div className="p-4 md:p-6">
      <Link to="/outsourcing?tab=labs" className="text-xs text-gray-400 hover:text-gray-600 mb-1 block">
        ← Outsource Labs
      </Link>
      <h1 className="text-2xl font-bold mb-1">{lab ? `Rates for ${lab.name}` : 'Rates'}</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        What this lab charges you per test. Only tests with a rate here can be sent to this lab from the order
        form — clear a rate to stop offering it. Past orders keep the cost they were booked at.
      </p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="border rounded px-3 py-1.5 text-sm w-64"
        />
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
      ) : rows.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">
          No outsource tests yet — add them under <Link to="/outsourcing?tab=tests" className="text-blue-600">Outsourcing → Tests</Link> first.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No tests match.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Suggested Patient Price</th>
                <th className="px-4 py-2 font-medium">This lab's cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.outsource_test_id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{r.test_code ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">{r.suggested_price != null ? `₹${r.suggested_price}` : '—'}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={costInputs[r.outsource_test_id] ?? ''}
                      onChange={(e) => updateCost(r.outsource_test_id, e.target.value)}
                      placeholder="Not offered"
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
