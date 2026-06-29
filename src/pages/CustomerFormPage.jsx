import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createCustomer, fetchCustomer, updateCustomer } from '../store/customerSlice';
import { useDebounce } from '../hooks/useDebounce';
import api from '../services/api';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  tags: '',
  notes: '',
};

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selected = useAppSelector((s) => s.customers.selected);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phoneMatches, setPhoneMatches] = useState([]);

  const debouncedPhone = useDebounce(form.phone, 400);

  useEffect(() => {
    if (isEdit) dispatch(fetchCustomer(Number(id)));
  }, [dispatch, id, isEdit]);

  // Warn (non-blocking) if another customer already uses this phone number
  useEffect(() => {
    if (!debouncedPhone || debouncedPhone.length < 6) {
      setPhoneMatches([]);
      return;
    }
    const params = { phone: debouncedPhone };
    if (isEdit) params.excludeId = Number(id);
    api.get('/customers/check-phone', { params }).then((r) => setPhoneMatches(r.data));
  }, [debouncedPhone, isEdit, id]);

  // Pre-fill form when customer loads in edit mode
  useEffect(() => {
    if (isEdit && selected && selected.id === Number(id)) {
      setForm({
        name: selected.name ?? '',
        phone: selected.phone ?? '',
        email: selected.email ?? '',
        tags: selected.tags?.join(', ') ?? '',
        notes: selected.notes ?? '',
      });
    }
  }, [selected, isEdit, id]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    const result = isEdit
      ? await dispatch(updateCustomer({ id: Number(id), ...payload }))
      : await dispatch(createCustomer(payload));

    setLoading(false);

    if ((isEdit ? updateCustomer : createCustomer).fulfilled.match(result)) {
      navigate(isEdit ? `/customers/${id}` : '/customers');
    } else {
      setError(result.error?.message || 'Something went wrong');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              name="name" value={form.name} onChange={handleChange} required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              name="phone" type="tel" value={form.phone} onChange={handleChange} required
            />
            {phoneMatches.length > 0 && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded px-2 py-1 mt-1">
                Already used by {phoneMatches.map((c) => c.name).join(', ')}. This is fine if they share a household — you can still save.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              name="email" type="email" value={form.email} onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              name="tags" placeholder="e.g. vip, dental, returning"
              value={form.tags} onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              name="notes" rows={3} value={form.notes} onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={loading}
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')}
            className="px-5 py-2 rounded border text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
