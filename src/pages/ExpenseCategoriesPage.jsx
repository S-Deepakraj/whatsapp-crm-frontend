import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchExpenseCategories, createExpenseCategory, updateExpenseCategory } from '../store/expenseCategorySlice';
import { Button } from '../components/ui/button';

export default function ExpenseCategoriesPage() {
  const dispatch = useAppDispatch();
  const { data: categories, loading } = useAppSelector((s) => s.expenseCategories);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { dispatch(fetchExpenseCategories({ includeInactive: true })); }, [dispatch]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await dispatch(createExpenseCategory({ name: name.trim() }));
    setSaving(false);
    if (createExpenseCategory.fulfilled.match(result)) {
      setName('');
    } else {
      setError(result.error?.message || 'Failed to add category.');
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  async function saveEdit(id) {
    await dispatch(updateExpenseCategory({ id, name: editName.trim() }));
    setEditingId(null);
  }

  function toggleActive(c) {
    dispatch(updateExpenseCategory({ id: c.id, active: !c.active }));
  }

  return (
    <div className="p-4 md:p-6">
      <Link to="/accounts?tab=expenses" className="text-xs text-gray-500 hover:underline">← Back to Expenses</Link>
      <h1 className="text-2xl font-bold mt-1 mb-4">Expense Categories</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fuel"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Category'}</Button>
      </form>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No categories yet — add one above.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className={`border-b last:border-0 ${!c.active ? 'opacity-50' : ''}`}>
                  {editingId === c.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-400">{c.active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(c.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => startEdit(c)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => toggleActive(c)} className="text-gray-500">
                          {c.active ? 'Deactivate' : 'Activate'}
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
