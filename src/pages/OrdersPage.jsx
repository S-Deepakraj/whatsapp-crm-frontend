import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOrders, updateOrderStatus } from '../store/orderSlice';
import OrderFormModal from '../components/OrderFormModal';
import CallButton from '../components/CallButton';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  confirmed:     { label: 'Confirmed',     className: 'bg-blue-100 text-blue-700' },
  assigned:      { label: 'Assigned',      className: 'bg-indigo-100 text-indigo-700' },
  collected:     { label: 'Collected',     className: 'bg-purple-100 text-purple-700' },
  report_ready:  { label: 'Report Ready',  className: 'bg-teal-100 text-teal-700' },
  closed:        { label: 'Closed',        className: 'bg-gray-100 text-gray-500' },
  cancelled:     { label: 'Cancelled',     className: 'bg-red-100 text-red-600' },
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const { data: orders, total, loading } = useAppSelector((s) => s.orders);
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [showAllDates, setShowAllDates] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageParams = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  useEffect(() => { setPage(1); }, [scheduledDate, showAllDates]);

  useEffect(() => {
    dispatch(fetchOrders({
      ...(showAllDates ? {} : { scheduledDate }),
      ...pageParams,
    }));
  }, [dispatch, scheduledDate, showAllDates, page]);

  function refetch() {
    dispatch(fetchOrders({ ...(showAllDates ? {} : { scheduledDate }), ...pageParams }));
  }

  function handleCancel(id) {
    if (window.confirm('Cancel this order?')) {
      dispatch(updateOrderStatus({ id, status: 'cancelled' }));
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Home Collection Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
        >
          + New Order
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          disabled={showAllDates}
          className="border rounded px-3 py-1.5 text-sm disabled:opacity-40"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={showAllDates} onChange={(e) => setShowAllDates(e.target.checked)} />
          All dates
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No orders for this date.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <Link to={`/customers/${o.customer_id}`} className="font-medium text-gray-800 hover:underline">
                      {o.customer_name}
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[o.status]?.className ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_STYLES[o.status]?.label ?? o.status}
                      </span>
                      <span className="text-xs text-gray-400">{o.customer_phone}</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(o.scheduled_date)} · {capitalize(o.time_slot)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{o.collection_address}</p>
                    <p className="text-xs text-gray-600">
                      {o.test_lines.map((l) => l.testName).join(', ')}
                      {' — '}
                      <span className="font-medium">
                        ₹{o.test_lines.reduce((s, l) => s + parseFloat(l.agreedPrice), 0).toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>

                  {o.status === 'confirmed' && (
                    <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                      <CallButton
                        phone={o.customer_phone}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 font-medium"
                      >
                        Call
                      </CallButton>
                      <button
                        onClick={() => handleCancel(o.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
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

      {showModal && (
        <OrderFormModal
          onClose={() => setShowModal(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
