import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchOrders, assignOrder } from '../store/orderSlice';
import { fetchTechnicians } from '../store/technicianSlice';
import CallButton from '../components/CallButton';
import WhatsAppButton from '../components/WhatsAppButton';
import { Button } from '../components/ui/button';

const STATUS_STYLES = {
  confirmed:     { label: 'Confirmed',     className: 'bg-blue-100 text-blue-700' },
  assigned:      { label: 'Assigned',      className: 'bg-indigo-100 text-indigo-700' },
  reached:       { label: 'Reached',       className: 'bg-cyan-100 text-cyan-700' },
  collected:     { label: 'Collected',     className: 'bg-purple-100 text-purple-700' },
  issue:         { label: 'Issue',         className: 'bg-red-100 text-red-600' },
  report_ready:  { label: 'Report Ready',  className: 'bg-teal-100 text-teal-700' },
  closed:        { label: 'Closed',        className: 'bg-gray-100 text-gray-500' },
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function DayViewPage() {
  const dispatch = useAppDispatch();
  const { data: orders, loading } = useAppSelector((s) => s.orders);
  const technicians = useAppSelector((s) => s.technicians.data);
  const [scheduledDate, setScheduledDate] = useState(todayStr());

  useEffect(() => { dispatch(fetchTechnicians()); }, [dispatch]);
  useEffect(() => { dispatch(fetchOrders({ scheduledDate, limit: 50 })); }, [dispatch, scheduledDate]);

  // Walk-ins are collected on the spot and ILS samples already arrive at
  // the lab — neither involves a technician, so they don't belong here.
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled' && o.channel === 'home_collection'),
    [orders]
  );

  // Columns: every active technician, plus any technician who has an order
  // today even if since deactivated, so nothing goes missing from the board.
  const columns = useMemo(() => {
    const byId = new Map(technicians.map((t) => [t.id, t]));
    for (const o of activeOrders) {
      if (o.technician_id && !byId.has(o.technician_id)) {
        byId.set(o.technician_id, { id: o.technician_id, name: o.technician_name, active: false });
      }
    }
    return [...byId.values()];
  }, [technicians, activeOrders]);

  const unassigned = activeOrders.filter((o) => !o.technician_id);

  function ordersFor(technicianId) {
    return activeOrders.filter((o) => o.technician_id === technicianId);
  }

  function handleAssign(orderId, technicianId) {
    dispatch(assignOrder({ id: orderId, technicianId }));
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Day View</h1>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          <Column
            title="Unassigned"
            count={unassigned.length}
            orders={unassigned}
            technicians={technicians}
            onAssign={handleAssign}
          />
          {columns.map((t) => (
            <Column
              key={t.id}
              title={t.name}
              subtitle={!t.active ? 'Inactive' : null}
              count={ordersFor(t.id).length}
              orders={ordersFor(t.id)}
              technicians={technicians}
              onAssign={handleAssign}
              assignedTechnicianId={t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Column({ title, subtitle, count, orders, technicians, onAssign, assignedTechnicianId }) {
  return (
    <div className="bg-gray-50 rounded-xl border w-72 shrink-0 flex flex-col">
      <div className="px-4 py-3 border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-gray-400">{count}</span>
        </div>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1 max-h-[70vh]">
        {orders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No orders</p>
        ) : (
          orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              technicians={technicians}
              onAssign={onAssign}
              assignedTechnicianId={assignedTechnicianId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({ order: o, technicians, onAssign, assignedTechnicianId }) {
  return (
    <div className="bg-white rounded-lg border p-3 text-sm space-y-1.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/customers/${o.customer_id}`} className="font-medium text-gray-800 hover:underline">
          {o.customer_name}
        </Link>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_STYLES[o.status]?.className ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_STYLES[o.status]?.label ?? o.status}
        </span>
      </div>
      <p className="text-xs text-gray-400">{formatTime(o.slot_start)}–{formatTime(o.slot_end)}</p>
      <p className="text-xs text-gray-500">{o.collection_address}</p>
      <p className="text-xs text-gray-600">{o.test_lines.map((l) => l.testName).join(', ')}</p>
      {o.status === 'issue' && o.issue_note && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{o.issue_note}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1.5 border-t flex-wrap">
        <div className="flex items-center gap-3">
          <CallButton phone={o.customer_phone} className="text-xs text-gray-500 hover:text-gray-700 py-1">
            Call
          </CallButton>
          {assignedTechnicianId && (
            <WhatsAppButton
              phone={o.technician_phone}
              message={buildTechnicianMessage(o)}
              className="text-xs text-blue-600 hover:text-blue-700 py-1"
            >
              WhatsApp
            </WhatsAppButton>
          )}
        </div>
        {assignedTechnicianId ? (
          <Button
            variant="link"
            size="xs"
            onClick={() => onAssign(o.id, null)}
            className="text-red-400 hover:text-red-600"
          >
            Unassign
          </Button>
        ) : (
          <select
            value=""
            onChange={(e) => e.target.value && onAssign(o.id, Number(e.target.value))}
            className="text-xs border rounded px-1.5 py-1.5"
          >
            <option value="">Assign to…</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function buildTechnicianMessage(o) {
  const link = `${window.location.origin}/t/${o.status_token}`;
  const tests = o.test_lines.map((l) => l.testName).join(', ');
  const date = new Date(o.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `*Home Collection Assignment*\n\n`
    + `*Customer:* ${o.customer_name}\n`
    + `*Phone:* ${o.customer_phone}\n`
    + `*Address:* ${o.collection_address}\n`
    + `*Date:* ${date}\n`
    + `*Time:* ${formatTime(o.slot_start)} – ${formatTime(o.slot_end)}\n`
    + `*Tests:* ${tests}\n\n`
    + `Update status here: ${link}`;
}
