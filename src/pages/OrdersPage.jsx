import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOrders, updateOrderStatus, notifyOrder, uploadReport } from '../store/orderSlice';
import { fetchPartnerLabs } from '../store/partnerLabSlice';
import OrderFormModal from '../components/OrderFormModal';
import AddPaymentModal from '../components/AddPaymentModal';
import Pagination from '../components/Pagination';
import api from '../services/api';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { buildOrderConfirmationMessage, buildOrderReminderMessage, buildOrderReportMessage, buildOrderCollectionAckMessage } from '../utils/messageBuilder';
import { Button } from '../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

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

const STATUS_OPTIONS = [
  { value: 'confirmed',     label: 'Confirmed' },
  { value: 'assigned',      label: 'Assigned' },
  { value: 'reached',       label: 'Reached' },
  { value: 'collected',     label: 'Collected' },
  { value: 'issue',         label: 'Issue' },
  { value: 'report_ready',  label: 'Report Ready' },
  { value: 'closed',        label: 'Closed' },
  { value: 'cancelled',     label: 'Cancelled' },
];

const CHANNEL_OPTIONS = [
  { value: 'home_collection', label: 'Home Collection' },
  { value: 'walk_in',         label: 'Walk-in' },
  { value: 'ils',             label: 'Partner Labs (ILS)' },
];

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

function OrderActionsMenu({ order: o, onEdit, onSendConfirmation, onSendReminder, onMarkCollected, onSendCollectionAck, onViewReport, onSendReport, onUploadReport, onClose, onCancel, onAddPayment }) {
  const fileInputRef = useRef(null);

  if (o.status === 'cancelled') return null;

  const canEdit = ['confirmed', 'assigned', 'collected'].includes(o.status);
  const canConfirmReminder = o.channel === 'home_collection';
  const canRemind = canConfirmReminder && o.scheduled_date?.slice(0, 10) === todayStr();
  const canMarkCollected = ['confirmed', 'assigned', 'reached', 'issue'].includes(o.status);
  const inReportStage = ['collected', 'report_ready', 'closed'].includes(o.status);
  const canSendCollectionAck = o.channel === 'home_collection' && inReportStage;
  const canClose = o.status === 'report_ready';
  const canCancel = o.status === 'confirmed';
  // ILS orders are paid via lab settlements, not per-order — same
  // constraint the backend enforces on payment creation.
  const canAddPayment = o.channel !== 'ils';

  return (
    <DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => onUploadReport(o, e.target.files[0])}
      />
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">Quick Actions ▾</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {o.channel !== 'ils' && (
          <DropdownMenuItem asChild>
            <a href={`tel:${o.customer_phone}`}>Call {o.customer_phone}</a>
          </DropdownMenuItem>
        )}
        {canEdit && <DropdownMenuItem onClick={() => onEdit(o)}>Edit order</DropdownMenuItem>}
        {canAddPayment && <DropdownMenuItem onClick={() => onAddPayment(o)}>Add payment</DropdownMenuItem>}

        {(canConfirmReminder || canMarkCollected || inReportStage) && <DropdownMenuSeparator />}

        {canConfirmReminder && (
          <DropdownMenuItem onClick={() => onSendConfirmation(o)}>
            {o.confirmation_sent_at ? '✓ Resend confirmation' : 'Send confirmation'}
          </DropdownMenuItem>
        )}
        {canRemind && (
          <DropdownMenuItem onClick={() => onSendReminder(o)}>
            {o.reminder_sent_at ? '✓ Resend reminder' : 'Send reminder'}
          </DropdownMenuItem>
        )}
        {canMarkCollected && (
          <DropdownMenuItem onClick={() => onMarkCollected(o.id)}>Mark collected</DropdownMenuItem>
        )}
        {canSendCollectionAck && (
          <DropdownMenuItem onClick={() => onSendCollectionAck(o)}>
            {o.collection_ack_sent_at ? '✓ Resend collection update' : 'Send collection update'}
          </DropdownMenuItem>
        )}

        {inReportStage && <DropdownMenuSeparator />}

        {inReportStage && (
          o.has_report ? (
            <>
              <DropdownMenuItem onClick={() => onViewReport(o)}>View report</DropdownMenuItem>
              {o.channel !== 'ils' && (
                <DropdownMenuItem onClick={() => onSendReport(o)}>
                  {o.report_sent_at ? '✓ Resend report' : 'Send report'}
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Upload report</DropdownMenuItem>
          )
        )}
        {canClose && <DropdownMenuItem onClick={() => onClose(o.id)}>Close order</DropdownMenuItem>}

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onCancel(o.id)}>Cancel order</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const { data: orders, total, loading } = useAppSelector((s) => s.orders);
  const settings = useAppSelector((s) => s.settings.data);
  const partnerLabs = useAppSelector((s) => s.partnerLabs.data);
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [showAllDates, setShowAllDates] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  // 'all' | 'home_collection' | 'walk_in' | 'ils' | `lab:<partnerLabId>` —
  // a specific lab is selectable directly, in one step, instead of picking
  // "Partner Labs" first and then a second dropdown for which one.
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageParams = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const isLabFilter = typeFilter.startsWith('lab:');
  const filterParams = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(isLabFilter ? { channel: 'ils', partnerLabId: typeFilter.slice(4) }
      : typeFilter !== 'all' ? { channel: typeFilter } : {}),
  };

  useEffect(() => { dispatch(fetchPartnerLabs()); }, [dispatch]);

  useEffect(() => { setPage(1); }, [scheduledDate, showAllDates, statusFilter, typeFilter]);

  useEffect(() => {
    dispatch(fetchOrders({
      ...(showAllDates ? {} : { scheduledDate }),
      ...filterParams,
      ...pageParams,
    }));
  }, [dispatch, scheduledDate, showAllDates, statusFilter, typeFilter, page]);

  function refetch() {
    dispatch(fetchOrders({ ...(showAllDates ? {} : { scheduledDate }), ...filterParams, ...pageParams }));
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

  function handleSendCollectionAck(o) {
    window.open(buildWhatsAppLink(o.customer_phone, buildOrderCollectionAckMessage(settings, o)), '_blank');
    dispatch(notifyOrder({ id: o.id, type: 'collection_ack' }));
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
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 pb-3 bg-gray-50">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button onClick={() => setShowModal(true)}>
          + New Order
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
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

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All order types</option>
          {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          {partnerLabs.length > 0 && (
            <optgroup label="Specific partner lab">
              {partnerLabs.map((l) => <option key={l.id} value={`lab:${l.id}`}>{l.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No orders match these filters.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map((o) => {
              const agreedTotal = o.test_lines.reduce((s, l) => s + parseFloat(l.agreedPrice), 0);
              const b2bTotal = o.test_lines.reduce((s, l) => s + (parseFloat(l.b2bRate) || 0), 0);
              return (
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
                      <span className="font-medium">₹{agreedTotal.toLocaleString('en-IN')}</span>
                      <span className="text-gray-400"> · B2B cost ₹{b2bTotal.toLocaleString('en-IN')}</span>
                    </p>
                    {o.status === 'issue' && o.issue_note && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 inline-block">{o.issue_note}</p>
                    )}
                  </div>

                  <OrderActionsMenu
                    order={o}
                    onEdit={setEditingOrder}
                    onSendConfirmation={handleSendConfirmation}
                    onSendReminder={handleSendReminder}
                    onMarkCollected={handleMarkCollected}
                    onSendCollectionAck={handleSendCollectionAck}
                    onViewReport={handleViewReport}
                    onSendReport={handleSendReport}
                    onUploadReport={handleUploadReport}
                    onClose={handleClose}
                    onCancel={handleCancel}
                    onAddPayment={setPaymentOrder}
                  />
                </div>
              </li>
              );
            })}
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

      {paymentOrder && (
        <AddPaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
        />
      )}
    </div>
  );
}
