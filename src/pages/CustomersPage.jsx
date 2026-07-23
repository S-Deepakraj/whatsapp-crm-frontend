import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCustomers } from '../store/customerSlice';
import { useDebounce } from '../hooks/useDebounce';
import { buildFollowupMessage } from '../utils/messageBuilder';
import WhatsAppButton from '../components/WhatsAppButton';
import CallButton from '../components/CallButton';
import Pagination from '../components/Pagination';
import api from '../services/api';
import { Button } from '../components/ui/button';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const dispatch = useAppDispatch();
  const { items, total, loading } = useAppSelector((s) => s.customers);
  const settings = useAppSelector((s) => s.settings.data);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Any new search resets back to page 1
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  useEffect(() => {
    dispatch(fetchCustomers({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }));
  }, [dispatch, debouncedSearch, page]);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await api.get('/customers/export', {
        params: debouncedSearch ? { search: debouncedSearch } : undefined,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'customers.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="shrink-0">
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button asChild className="shrink-0">
            <Link to="/customers/new">+ Add Customer</Link>
          </Button>
        </div>
      </div>

      <input
        className="border rounded px-3 py-2 mb-5 w-full max-w-sm text-sm"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No customers yet</p>
          <Link to="/customers/new" className="text-green-600 hover:underline text-sm">
            Add your first customer
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.id}`} className="text-green-700 font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone}</td>
                    <td className="px-4 py-3">
                      {c.tags?.length
                        ? c.tags.map((t) => (
                            <span key={t} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mr-1">
                              {t}
                            </span>
                          ))
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <CallButton
                          phone={c.phone}
                          className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded font-medium hover:bg-gray-200"
                        >
                          Call
                        </CallButton>
                        <WhatsAppButton
                          phone={c.phone}
                          message={buildFollowupMessage(settings, c.name)}
                          className="text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded font-medium hover:bg-green-200"
                        >
                          WhatsApp
                        </WhatsAppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        </>
      )}
    </div>
  );
}
