import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOrders, updateOrderStatus, uploadReport } from '../store/orderSlice';
import SelfCollectedOrderModal from '../components/SelfCollectedOrderModal';
import api from '../services/api';
import { Button } from '../components/ui/button';

const STATUS_STYLES = {
  confirmed:  { label: 'Confirmed',  className: 'bg-blue-100 text-blue-700' },
  assigned:   { label: 'Assigned',   className: 'bg-indigo-100 text-indigo-700' },
  reached:    { label: 'Reached',    className: 'bg-cyan-100 text-cyan-700' },
  collected:  { label: 'Collected',  className: 'bg-purple-100 text-purple-700' },
  issue:      { label: 'Issue',      className: 'bg-red-100 text-red-600' },
  report_ready: { label: 'Report Ready', className: 'bg-teal-100 text-teal-700' },
  closed:     { label: 'Closed',     className: 'bg-gray-100 text-gray-500' },
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function OrderCard({ order, onMarkReached, onMarkCollected, onReportIssue, onUploadReport, onViewReport }) {
  const fileInputRef = useRef(null);
  const name = order.channel === 'ils' ? order.patient_name : order.customer_name;
  const canMarkReached = order.status === 'assigned';
  const canMarkCollected = order.status === 'reached';
  const canReportIssue = ['assigned', 'reached'].includes(order.status);
  const canUploadReport = ['collected', 'reached'].includes(order.status);

  return (
    <li className="bg-white rounded-xl shadow-sm border p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => e.target.files[0] && onUploadReport(order, e.target.files[0])}
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <span className="font-medium text-gray-800">{name}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[order.status]?.className ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_STYLES[order.status]?.label ?? order.status}
            </span>
            {order.channel === 'walk_in' && (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">Walk-in</span>
            )}
            {order.channel === 'ils' && (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">ILS · {order.partner_lab_name}</span>
            )}
            {order.channel === 'home_collection' && order.slot_start && (
              <span className="text-xs text-gray-400">{formatTime(order.slot_start)}–{formatTime(order.slot_end)}</span>
            )}
          </div>
          {order.collection_address && <p className="text-xs text-gray-500">{order.collection_address}</p>}
          <p className="text-xs text-gray-600">{order.test_lines.map((l) => l.testName).join(', ')}</p>
          {order.status === 'issue' && order.issue_note && (
            <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 inline-block">{order.issue_note}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {canMarkReached && <Button size="sm" onClick={() => onMarkReached(order.id)}>Mark Reached</Button>}
          {canMarkCollected && <Button size="sm" onClick={() => onMarkCollected(order.id)}>Mark Collected</Button>}
          {canReportIssue && <Button size="sm" variant="outline" onClick={() => onReportIssue(order.id)}>Report Issue</Button>}
          {canUploadReport && !order.has_report && (
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Upload Report</Button>
          )}
          {order.has_report && (
            <Button size="sm" variant="outline" onClick={() => onViewReport(order)}>View Report</Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function MyOrdersPage() {
  const dispatch = useAppDispatch();
  const { data: orders, loading } = useAppSelector((s) => s.orders);
  const [date, setDate] = useState(today());
  const [showAddModal, setShowAddModal] = useState(false);
  const [issueOrderId, setIssueOrderId] = useState(null);
  const [issueNote, setIssueNote] = useState('');

  function refetch() { dispatch(fetchOrders({ scheduledDate: date, limit: 50 })); }

  useEffect(() => { refetch(); }, [dispatch, date]);

  function handleMarkReached(id) {
    dispatch(updateOrderStatus({ id, status: 'reached' }));
  }

  function handleMarkCollected(id) {
    dispatch(updateOrderStatus({ id, status: 'collected' }));
  }

  async function submitIssue() {
    await dispatch(updateOrderStatus({ id: issueOrderId, status: 'issue', note: issueNote.trim() || null }));
    setIssueOrderId(null);
    setIssueNote('');
  }

  function handleUploadReport(order, file) {
    dispatch(uploadReport({ id: order.id, file }));
  }

  async function handleViewReport(order) {
    const response = await api.get(`/orders/${order.id}/report`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    window.open(url, '_blank');
  }

  return (
    <div className="p-4 md:p-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 pb-3 bg-gray-50">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Button onClick={() => setShowAddModal(true)}>+ Add Order</Button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Button type="button" variant={date === today() ? 'default' : 'outline'} size="sm" onClick={() => setDate(today())}>Today</Button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No orders assigned to you for this date.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onMarkReached={handleMarkReached}
              onMarkCollected={handleMarkCollected}
              onReportIssue={setIssueOrderId}
              onUploadReport={handleUploadReport}
              onViewReport={handleViewReport}
            />
          ))}
        </ul>
      )}

      {issueOrderId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIssueOrderId(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Report an Issue</h2>
            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              placeholder="What happened?"
              className="w-full border rounded px-3 py-2 text-sm mb-3"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIssueOrderId(null)}>Cancel</Button>
              <Button onClick={submitIssue}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <SelfCollectedOrderModal onClose={() => setShowAddModal(false)} onCreated={refetch} />
      )}
    </div>
  );
}
