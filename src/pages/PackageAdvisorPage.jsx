import { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTests } from '../store/testCatalogSlice';
import { clearRecommendations, fetchIndexStatus, fetchRecommendations, rebuildIndex } from '../store/recommendationSlice';
import { publishToast } from '../utils/toastBus';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const CATEGORY_STYLES = {
  test:    'bg-blue-100 text-blue-700',
  profile: 'bg-purple-100 text-purple-700',
  package: 'bg-amber-100 text-amber-700',
  outlab:  'bg-teal-100 text-teal-700',
};

function rupees(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function signedRupees(value) {
  if (value === 0) return 'same';
  return `${value > 0 ? '+' : '−'}${rupees(Math.abs(value))}`;
}

function CategoryBadge({ category }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[category] ?? 'bg-gray-100 text-gray-700'}`}>
      {category}
    </span>
  );
}

function Amount({ label, value, hint, hintGood }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
      {hint && <p className={`text-xs ${hintGood ? 'text-green-700' : 'text-gray-500'}`}>{hint}</p>}
    </div>
  );
}

function RecommendationCard({ rec, rank }) {
  const mrpDiff = rec.vsIndividual?.mrpDiff;
  const marginDiff = rec.vsIndividual?.marginDiff;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400">#{rank}</span>
        {rec.items.map((item, i) => (
          <span key={item.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-400">+</span>}
            <span className="font-semibold text-gray-800">{item.name}</span>
            <CategoryBadge category={item.category} />
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Amount
          label="Customer pays"
          value={rupees(rec.mrp)}
          hint={rec.vsIndividual ? `${signedRupees(mrpDiff)} vs separately` : null}
          hintGood={mrpDiff < 0}
        />
        <Amount label="Our cost" value={rupees(rec.cost)} />
        <Amount
          label="Margin"
          value={rupees(rec.margin)}
          hint={rec.vsIndividual ? `${signedRupees(marginDiff)} vs separately` : null}
          hintGood={marginDiff > 0}
        />
        <Amount label="Margin %" value={`${rec.marginPct}%`} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {rec.covered.map((t) => (
          <span key={t.code} className="inline-flex items-center gap-1 bg-green-50 text-green-700 rounded px-1.5 py-0.5">
            <Check className="size-3" /> {t.name}
          </span>
        ))}
        {rec.missing.map((t) => (
          <span key={t.code} className="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded px-1.5 py-0.5">
            <X className="size-3" /> {t.name}
          </span>
        ))}
        {rec.extraTests > 0 && (
          <span className="text-gray-500 px-1">+ {rec.extraTests} more {rec.extraTests === 1 ? 'test' : 'tests'}</span>
        )}
      </div>

      {rec.reason && <p className="text-sm text-gray-600">{rec.reason}</p>}
    </div>
  );
}

export default function PackageAdvisorPage() {
  const dispatch = useAppDispatch();
  const { data: tests } = useAppSelector((s) => s.testCatalog);
  const { result, status, loading, rebuilding } = useAppSelector((s) => s.recommendations);

  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [picked, setPicked] = useState([]);
  const [pickerValue, setPickerValue] = useState('');

  useEffect(() => {
    dispatch(fetchTests());
    dispatch(fetchIndexStatus());
    return () => { dispatch(clearRecommendations()); };
  }, [dispatch]);

  const testsById = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  function addPicked(e) {
    const id = Number(e.target.value);
    if (id && !picked.includes(id)) setPicked((p) => [...p, id]);
    setPickerValue('');
  }

  function runSearch(payload) {
    dispatch(fetchRecommendations({ ...payload, gender: gender || null }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch({ query, testIds: picked });
  }

  // Removing a wrongly matched test re-runs with exactly what's left, so the
  // model doesn't get a chance to resolve the same input the same way again.
  function removeResolved(itemId) {
    const remaining = result.requested.filter((r) => r.itemId && r.itemId !== itemId).map((r) => r.itemId);
    if (remaining.length === 0) {
      dispatch(clearRecommendations());
      return;
    }
    setQuery('');
    setPicked(remaining);
    runSearch({ query: '', testIds: remaining });
  }

  async function handleRebuild() {
    const outcome = await dispatch(rebuildIndex());
    if (rebuildIndex.fulfilled.match(outcome)) {
      const { embedded, unchanged } = outcome.payload;
      publishToast({ message: `Search index updated: ${embedded} changed, ${unchanged} unchanged.`, type: 'success' });
      dispatch(fetchIndexStatus());
    }
  }

  const missingContents = status ? status.bundles - status.bundles_with_contents : 0;
  const canSubmit = !loading && (query.trim() || picked.length > 0) && status?.aiConfigured !== false;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Package Advisor</h1>
        {status?.vectorSearchAvailable && status?.embeddingConfigured && (
          <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding}>
            {rebuilding ? 'Rebuilding…' : 'Rebuild AI index'}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Enter the tests a customer asked for to see which packages cover them, with what they earn you.
      </p>

      {status && !status.aiConfigured && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          AI isn&apos;t set up yet. Add ANTHROPIC_API_KEY to the backend environment to use this page.
        </p>
      )}
      {status && missingContents > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {status.bundles_with_contents === 0
            ? 'None of your packages have their test lists captured yet, so no package can be suggested. '
            : `${missingContents} of ${status.bundles} packages and profiles have no test list captured, so they won't be suggested. `}
          Capture them with the Thyrocare portal extension.
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-5 space-y-3">
        <div>
          <label htmlFor="advisor-query" className="block text-xs font-medium text-gray-500 mb-1">Tests asked for</label>
          <Input
            id="advisor-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. vitamin d, vitamin b-12, tft"
            maxLength={1000}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="advisor-picker" className="block text-xs font-medium text-gray-500 mb-1">Or pick from the catalog</label>
            <select
              id="advisor-picker"
              value={pickerValue}
              onChange={addPicked}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a test</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label htmlFor="advisor-gender" className="block text-xs font-medium text-gray-500 mb-1">Customer gender</label>
            <select
              id="advisor-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <Button type="submit" disabled={!canSubmit}>
            <Sparkles className="size-4" />
            {loading ? 'Finding options…' : 'Find options'}
          </Button>
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {picked.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-700">
                {testsById.get(id)?.name ?? `Test ${id}`}
                <button
                  type="button"
                  aria-label={`Remove ${testsById.get(id)?.name ?? 'test'}`}
                  onClick={() => setPicked((p) => p.filter((x) => x !== id))}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </form>

      {loading && <p className="text-sm text-gray-500">Checking your catalog. This can take up to a minute.</p>}

      {!loading && result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Understood as</p>
            <div className="flex flex-wrap gap-1.5">
              {result.requested.filter((r) => r.itemId || r.code).map((r) => (
                <span key={`${r.input}-${r.itemId ?? r.code}`} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-700">
                  <span className="text-gray-400">{r.input} →</span> {r.name}
                  {r.itemId && (
                    <button type="button" aria-label={`Remove ${r.name}`} onClick={() => removeResolved(r.itemId)}>
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {result.unresolved.length > 0 && (
              <p className="mt-2 text-sm text-red-700">Couldn&apos;t find: {result.unresolved.join(', ')}</p>
            )}
            {result.notes && <p className="mt-2 text-sm text-gray-600">{result.notes}</p>}
          </div>

          {result.individual && (
            <div className="rounded-xl border border-dashed bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">Buying these separately</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Amount label="Customer pays" value={rupees(result.individual.mrp)} />
                <Amount label="Our cost" value={rupees(result.individual.cost)} />
                <Amount label="Margin" value={rupees(result.individual.margin)} />
                <Amount label="Margin %" value={`${result.individual.marginPct}%`} />
              </div>
              {!result.individual.complete && (
                <p className="mt-2 text-xs text-gray-500">
                  Some tests aren&apos;t sold individually, so this total leaves them out.
                </p>
              )}
            </div>
          )}

          {result.recommendations.map((rec, i) => (
            <RecommendationCard key={rec.items.map((item) => item.id).join('-')} rec={rec} rank={i + 1} />
          ))}
          {result.recommendations.length === 0 && (
            <p className="text-sm text-gray-500">No package covers these tests.</p>
          )}

          <p className="text-xs text-gray-400">
            Prices are MRP and costs are for {result.date}, including any active cost overrides. Any discount you give reduces the margin.
          </p>
        </div>
      )}
    </div>
  );
}
