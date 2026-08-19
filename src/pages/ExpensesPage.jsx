import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchExpenses, createExpense, updateExpense, deleteExpense } from '../store/expenseSlice';
import { fetchExpenseCategories } from '../store/expenseCategorySlice';
import { fetchTechnicians } from '../store/technicianSlice';
import { Button } from '../components/ui/button';

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { expenseDate: today(), categoryId: '', amount: '', technicianId: '', notes: '' };

export default function ExpensesPage() {
  const dispatch = useAppDispatch();
  const { data: expenses, loading } = useAppSelector((s) => s.expenses);
  const categories = useAppSelector((s) => s.expenseCategories.data);
  const technicians = useAppSelector((s) => s.technicians.data);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { dispatch(fetchExpenses()); }, [dispatch]);
  useEffect(() => { dispatch(fetchExpenseCategories()); }, [dispatch]);
  useEffect(() => { dispatch(fetchTechnicians()); }, [dispatch]);

  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm((f) => ({ ...f, categoryId: String(categories[0].id) }));
    }
  }, [categories, form.categoryId]);

  const selectedCategory = categories.find((c) => c.id === Number(form.categoryId));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.categoryId) return setError('Add a category first');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(createExpense({
      expenseDate: form.expenseDate,
      categoryId: Number(form.categoryId),
      amount: Number(form.amount),
      technicianId: form.technicianId ? Number(form.technicianId) : null,
      notes: form.notes.trim() || null,
    }));
    setSaving(false);
    if (createExpense.fulfilled.match(result)) {
      setForm((f) => ({ ...EMPTY_FORM, categoryId: f.categoryId }));
    } else {
      setError(result.error?.message || 'Failed to add expense.');
    }
  }

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  function startEdit(e) {
    setEditingId(e.id);
    setEditForm({
      expenseDate: e.expense_date.slice(0, 10),
      categoryId: String(e.category_id),
      amount: String(e.amount),
      technicianId: e.technician_id ? String(e.technician_id) : '',
      notes: e.notes || '',
    });
    setEditError(null);
  }

  async function saveEdit(id) {
    if (!editForm.amount || Number(editForm.amount) <= 0) return setEditError('Enter a valid amount');
    setSavingEdit(true);
    setEditError(null);
    const result = await dispatch(updateExpense({
      id,
      expenseDate: editForm.expenseDate,
      categoryId: Number(editForm.categoryId),
      amount: Number(editForm.amount),
      technicianId: editForm.technicianId ? Number(editForm.technicianId) : null,
      notes: editForm.notes.trim() || null,
    }));
    setSavingEdit(false);
    if (updateExpense.fulfilled.match(result)) {
      setEditingId(null);
    } else {
      setEditError(result.error?.message || 'Failed to update expense.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    setDeletingId(id);
    await dispatch(deleteExpense(id));
    setDeletingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4 gap-3 flex-wrap">
        <Link to="/finance/expense-categories" className="text-sm text-blue-600 hover:underline">Manage Categories</Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          No expense categories yet — <Link to="/finance/expense-categories" className="underline font-medium">add one</Link> before logging an expense.
        </p>
      ) : (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              max={today()}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number" min="0.01" step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          {selectedCategory?.name?.toLowerCase() === 'phlebotomist' && (
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-500 mb-1">Technician <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                value={form.technicianId}
                onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add Expense'}</Button>
        </form>
      )}
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No expenses recorded yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Technician</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                editingId === e.id ? (
                  <tr key={e.id} className="border-b last:border-0 bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editForm.expenseDate}
                        onChange={(ev) => setEditForm((f) => ({ ...f, expenseDate: ev.target.value }))}
                        max={today()}
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editForm.categoryId}
                        onChange={(ev) => setEditForm((f) => ({ ...f, categoryId: ev.target.value }))}
                        className="w-full border rounded px-2 py-1"
                      >
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editForm.technicianId}
                        onChange={(ev) => setEditForm((f) => ({ ...f, technicianId: ev.target.value }))}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="">—</option>
                        {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="0.01" step="0.01"
                        value={editForm.amount}
                        onChange={(ev) => setEditForm((f) => ({ ...f, amount: ev.target.value }))}
                        className="w-24 border rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(ev) => setEditForm((f) => ({ ...f, notes: ev.target.value }))}
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Button variant="link" size="xs" onClick={() => saveEdit(e.id)} disabled={savingEdit} className="text-green-600 mr-1">
                        {savingEdit ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-2">{e.category_name}</td>
                    <td className="px-4 py-2 text-gray-500">{e.technician_name || '—'}</td>
                    <td className="px-4 py-2 font-medium">₹{parseFloat(e.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-gray-400">{e.notes || '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Button variant="link" size="xs" onClick={() => startEdit(e)} className="text-gray-500 mr-1">Edit</Button>
                      <Button
                        variant="link" size="xs"
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="text-red-500"
                      >
                        {deletingId === e.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="px-4 py-2 font-medium" colSpan={3}>Total</td>
                <td className="px-4 py-2 font-bold">₹{total.toLocaleString('en-IN')}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
