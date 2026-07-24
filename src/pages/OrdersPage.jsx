import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOrders, updateOrderStatus, notifyOrder, uploadReport } from '../store/orderSlice';
import OrderFormModal from '../components/OrderFormModal';
import CallButton from '../components/CallButton';
import Pagination from '../components/Pagination';
import api from '../services/api';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { buildOrderConfirmationMessage, buildOrderReminderMessage, buildOrderReportMessage } from '../utils/messageBuilder';
import { Button } from '../components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  confirmed:     { label: 'Confirmed',     className: 'bg-blue-100 text-blue-700' },
  assigned:      { label: 'Assigned',      className: 'bg-indigo-100 text-indigo-700' },
  reached:       { label: 'Reached',       className: 'bg-cyan-100 text-cyan-700' },
  collected:     { label: 'Collected',     className: 'bg-purple-100 text-purple-700' },
  issue:         { label: 'Issue',         className: 'bg-red-100 text-red-600' },
  report_ready:  { label: 'Report Ready',  className: 'bg-teal-100 text-teal-700' },
  closed:        { label: 'Closed',        className: 'bg-gray-100 text-gray-500' },
  cancelled:     { label: 'Cancelled',     className: 'bg-red-100 text-red-600' },
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function shiftDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const QUICK_RANGES = [
  { label: 'Yesterday', days: -1 },
  { label: 'Today',     days: 0 },
  { label: 'Tomorrow',  days: 1 },
];

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const { data: orders, total, loading } = useAppSelector((s) => s.orders);
  const settings = useAppSelector((s) => s.settings.data);
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [showAllDates, setShowAllDates] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

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

  function handleSendConfirmation(o) {
    window.open(buildWhatsAppLink(o.customer_phone, buildOrderConfirmationMessage(settings, o)), '_blank');
    dispatch(notifyOrder({ id: o.id, type: 'confirmation' }));
  }

  function handleSendReminder(o) {
    window.open(buildWhatsAppLink(o.customer_phone, buildOrderReminderMessage(settings, o)), '_blank');
    dispatch(notifyOrder({ id: o.id, type: 'reminder' }));
  }

  function handleUploadReport(o, file) {
    if (!file) return;
    dispatch(uploadReport({ id: o.id, file }));
  }

  async function handleViewReport(o) {
    const response = await api.get(`/orders/${o.id}/report`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    window.open(url, '_blank');
  }

  function handleSendReport(o) {
    const reportUrl = `${API_BASE}/public/reports/${o.report_token}`;
    window.open(buildWhatsAppLink(o.customer_phone, buildOrderReportMessage(settings, o, reportUrl)), '_blank');
    dispatch(notifyOrder({ id: o.id, type: 'report' }));
  }

  function handleClose(id) {
    dispatch(updateOrderStatus({ id, status: 'closed' }));
  }

  function handleMarkCollected(id) {
    dispatch(updateOrderStatus({ id, status: 'collected' }));
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button onClick={() => setShowModal(true)}>
          + New Order
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {QUICK_RANGES.map((r) => {
            const rangeDate = shiftDateStr(r.days);
            const active = !showAllDates && scheduledDate === rangeDate;
            return (
              <Button
                key={r.label}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setScheduledDate(rangeDate); setShowAllDates(false); }}
              >
                {r.label}
              </Button>
            );
          })}
        </div>
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
                    {o.channel === 'ils' ? (
                      <span className="font-medium text-gray-800">{o.patient_name}</span>
                    ) : (
                      <Link to={`/customers/${o.customer_id}`} className="font-medium text-gray-800 hover:underline">
                        {o.customer_name}
                      </Link>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[o.status]?.className ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_STYLES[o.status]?.label ?? o.status}
                      </span>
                      {o.channel === 'walk_in' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                          Walk-in
                        </span>
                      )}
                      {o.channel === 'ils' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">
                          ILS · {o.partner_lab_name}
                        </span>
                      )}
                      {o.channel !== 'ils' && <span className="text-xs text-gray-400">{o.customer_phone}</span>}
                      <span className="text-xs text-gray-400">
                        {o.channel === 'home_collection'
                          ? `${formatDate(o.scheduled_date)} · ${formatTime(o.slot_start)}–${formatTime(o.slot_end)}`
                          : formatDate(o.scheduled_date)}
                      </span>
                      {o.technician_name && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                          {o.technician_name}
                        </span>
                      )}
                    </div>
                    {o.channel === 'home_collection' && <p className="text-xs text-gray-500">{o.collection_address}</p>}
                    <p className="text-xs text-gray-600">
                      {o.test_lines.map((l) => l.testName).join(', ')}
                      {' — '}
                      <span className="font-medium">
                        ₹{o.test_lines.reduce((s, l) => s + parseFloat(l.agreedPrice), 0).toLocaleString('en-IN')}
                      </span>
                    </p>
                    {o.status === 'issue' && o.issue_note && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 inline-block">{o.issue_note}</p>
                    )}
                  </div>

                  {o.status !== 'cancelled' && (
                    <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
                      {o.channel !== 'ils' && (
                        <CallButton
                          phone={o.customer_phone}
                          className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Call
                        </CallButton>
                      )}
                      {['confirmed', 'assigned'].includes(o.status) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingOrder(o)}
                        >
                          Edit
                        </Button>
                      )}
                      {o.channel === 'home_collection' && (
                        <>
                          {o.confirmation_sent_at && (
                            <span className="text-xs text-green-600">✓ Confirmed sent</span>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleSendConfirmation(o)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            {o.confirmation_sent_at ? 'Resend Confirmation' : 'Send Confirmation'}
                          </Button>
                        </>
                      )}
                      {o.channel === 'home_collection' && o.scheduled_date?.slice(0, 10) === todayStr() && (
                        <>
                          {o.reminder_sent_at && (
                            <span className="text-xs text-green-600">✓ Reminder sent</span>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleSendReminder(o)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            {o.reminder_sent_at ? 'Resend Reminder' : 'Send Reminder'}
                          </Button>
                        </>
                      )}
                      {['confirmed', 'assigned', 'reached', 'issue'].includes(o.status) && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkCollected(o.id)}
                          className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                        >
                          Mark Collected
                        </Button>
                      )}
                      {['collected', 'report_ready', 'closed'].includes(o.status) && (
                        o.has_report ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewReport(o)}
                            >
                              View Report
                            </Button>
                            {o.channel !== 'ils' && (
                              o.report_sent_at ? (
                                <span className="text-xs text-green-600">✓ Report sent</span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendReport(o)}
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                  Send Report
                                </Button>
                              )
                            )}
                          </>
                        ) : (
                          <Button asChild size="sm" className="bg-teal-100 text-teal-700 hover:bg-teal-200 cursor-pointer">
                            <label>
                              Upload Report
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => handleUploadReport(o, e.target.files[0])}
                              />
                            </label>
                          </Button>
                        )
                      )}
                      {o.status === 'report_ready' && (
                        <Button size="sm" variant="secondary" onClick={() => handleClose(o.id)}>
                          Close
                        </Button>
                      )}
                      {o.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(o.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          Cancel
                        </Button>
                      )}
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

      {editingOrder && (
        <OrderFormModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
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

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
