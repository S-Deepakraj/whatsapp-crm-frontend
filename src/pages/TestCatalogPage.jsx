import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTests, updateTest } from '../store/testCatalogSlice';
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

const EMPTY_FORM = { name: '', testCode: '', category: 'test', mrp: '', b2bRate: '' };

export default function TestCatalogPage() {
  const dispatch = useAppDispatch();
  const { data: tests, loading } = useAppSelector((s) => s.testCatalog);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q);
    });
  }, [tests, search, categoryFilter]);

  function startEdit(test) {
    setEditingId(test.id);
    setEditForm({
      name: test.name,
      testCode: test.test_code ?? '',
      category: test.category,
      mrp: test.mrp ?? '',
      b2bRate: test.b2b_rate ?? '',
    });
  }

  async function saveEdit(id) {
    await dispatch(updateTest({
      id,
      name: editForm.name.trim(),
      testCode: editForm.testCode.trim() || null,
      category: editForm.category,
      mrp: editForm.mrp ? parseFloat(editForm.mrp) : null,
      b2bRate: editForm.b2bRate ? parseFloat(editForm.b2bRate) : null,
    }));
    setEditingId(null);
  }

  function toggleActive(test) {
    dispatch(updateTest({ id: test.id, active: !test.active }));
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Test Catalog</h1>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        MRP and B2B rate are reference prices only — the price actually billed for an order is agreed on the call and entered per order.
        Tests are seeded from the price-list spreadsheet; edit or deactivate them here.
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
        <span className="text-xs text-gray-400">{filtered.length} of {tests.length}</span>
      </div>

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
                <th className="px-4 py-2 font-medium">B2B Rate</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${!t.active ? 'opacity-50' : ''}`}>
                  {editingId === t.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.testCode}
                          onChange={(e) => setEditForm((f) => ({ ...f, testCode: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          className="border rounded px-2 py-1"
                        >
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.mrp}
                          onChange={(e) => setEditForm((f) => ({ ...f, mrp: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.b2bRate}
                          onChange={(e) => setEditForm((f) => ({ ...f, b2bRate: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-400">{t.active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(t.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{t.test_code ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_STYLES[t.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {categoryLabel(t.category)}
                        </span>
                      </td>
                      <td className="px-4 py-2">{t.mrp != null ? `₹${t.mrp}` : '—'}</td>
                      <td className="px-4 py-2">{t.b2b_rate != null ? `₹${t.b2b_rate}` : '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => startEdit(t)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => toggleActive(t)} className="text-gray-500">
                          {t.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
