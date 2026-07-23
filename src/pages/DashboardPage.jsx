import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchFollowups, completeFollowup } from '../store/followupSlice';
import { buildFollowupMessage, buildThankYouMessage } from '../utils/messageBuilder';
import WhatsAppButton from '../components/WhatsAppButton';
import { Button } from '../components/ui/button';

const CARDS = [
  {
    key: 'customers',
    label: 'Customers',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: '👥',
    link: '/customers',
  },
  {
    key: 'todayVisits',
    label: "Today's Visits",
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    icon: '🧾',
    link: '/customers',
  },
  {
    key: 'todayFollowups',
    label: "Today's Follow-Ups",
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: '📋',
    link: '/followups',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: '⚠️',
    link: '/followups',
  },
  {
    key: 'completedThisWeek',
    label: 'Completed This Week',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    icon: '✅',
    link: '/followups',
  },
];

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { items: todayFollowups, loading: followupsLoading } = useAppSelector((s) => s.followups);
  const settings = useAppSelector((s) => s.settings.data);

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [todayVisits, setTodayVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(() => setError('Could not load stats'));
  }, []);

  useEffect(() => {
    dispatch(fetchFollowups({ date: today, status: 'pending' }));
  }, [dispatch, today]);

  useEffect(() => {
    api.get('/dashboard/today-visits')
      .then((r) => setTodayVisits(r.data))
      .finally(() => setVisitsLoading(false));
  }, []);

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">{todayLabel}</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.key}
            to={card.link}
            className={`rounded-xl p-5 ${card.bg} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className={`text-4xl font-bold ${card.color}`}>
              {stats ? stats[card.key] : '—'}
            </p>
            <p className="text-sm text-gray-600 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl p-5 bg-green-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-green-700">
            {stats ? `₹${Number(stats.todayVisitsRevenue).toLocaleString('en-IN')}` : '—'}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total Amount Collected Today</p>
        </div>
        <div className="rounded-xl p-5 bg-amber-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🧪</span>
          </div>
          <p className="text-4xl font-bold text-amber-700">
            {stats ? `₹${Number(stats.todayCostB2B).toLocaleString('en-IN')}` : '—'}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total Cost (B2B) Today</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Today's Follow-Ups</h2>
          <Link to="/followups" className="text-sm text-green-600 hover:underline">View all</Link>
        </div>

        {followupsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        ) : todayFollowups.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center bg-white rounded-xl border">
            No follow-ups due today.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayFollowups.map((f) => (
              <div key={f.id} className="bg-white border rounded-xl p-4 space-y-3">
                <div>
                  <p className="font-medium text-gray-800">{f.customer_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.customer_phone} · Due {formatDate(f.due_date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => dispatch(completeFollowup(f.id))}
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    Complete
                  </Button>
                  <WhatsAppButton
                    phone={f.customer_phone}
                    message={buildFollowupMessage(settings, f.customer_name)}
                    className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded font-medium hover:bg-blue-200"
                  >
                    WhatsApp
                  </WhatsAppButton>
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/customers/${f.customer_id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Today's Visits</h2>
          {stats?.todayVisitsRevenue > 0 && (
            <span className="text-sm text-gray-500">
              ₹{Number(stats.todayVisitsRevenue).toLocaleString('en-IN')} collected
            </span>
          )}
        </div>

        {visitsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        ) : todayVisits.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center bg-white rounded-xl border">
            No visits logged today yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayVisits.map((v) => (
              <div key={v.id} className="bg-white border rounded-xl p-4 space-y-3">
                <div>
                  <p className="font-medium text-gray-800">{v.customer_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {v.items?.map((i) => i.serviceName).join(', ') || 'No services listed'}
                  </p>
                  <p className="text-sm font-semibold text-green-700 mt-1">
                    ₹{parseFloat(v.total_amount).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <WhatsAppButton
                    phone={v.customer_phone}
                    message={buildThankYouMessage(settings, v.customer_name)}
                    className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded font-medium hover:bg-blue-200"
                  >
                    WhatsApp
                  </WhatsAppButton>
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/customers/${v.customer_id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
