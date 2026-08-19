import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDailyReport, fetchWeeklyReport, fetchMonthlyReport } from '../store/reportSlice';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../components/ui/chart';
import { Button } from '../components/ui/button';

function today() {
  return new Date().toISOString().split('T')[0];
}

function currentMonth() {
  return today().slice(0, 7);
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function money(v) {
  return `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TrendBadge({ pct }) {
  if (pct == null) return <span className="text-xs text-gray-400">New</span>;
  if (pct === 0) return <span className="text-xs text-gray-400">No change</span>;
  const up = pct > 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs previous
    </span>
  );
}

function StatCard({ label, value, trendPct, tone }) {
  const toneClass = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-800';
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {trendPct !== undefined && <div className="mt-1"><TrendBadge pct={trendPct} /></div>}
    </div>
  );
}

function IlsByLabTable({ labs, title = 'Revenue by Partner Lab (ILS)' }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      {labs.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center bg-white rounded-xl border">No ILS settlements in this period.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Lab</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Margin</th>
                <th className="px-4 py-2 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {[...labs].sort((a, b) => (b.marginPct ?? -1) - (a.marginPct ?? -1)).map((lab) => (
                <tr key={lab.partnerLabId} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{lab.partnerLabName}</td>
                  <td className="px-4 py-2 text-gray-500">{lab.orderCount}</td>
                  <td className="px-4 py-2">{money(lab.expected)}</td>
                  <td className="px-4 py-2">{money(lab.received)}</td>
                  <td className="px-4 py-2">{money(lab.margin)}</td>
                  <td className="px-4 py-2">{lab.marginPct != null ? `${lab.marginPct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpensesTable({ expenses }) {
  const entries = Object.entries(expenses.byCategory);
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Expenses</h2>
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">No expenses in this period.</td></tr>
            ) : entries.map(([cat, amt]) => (
              <tr key={cat} className="border-b last:border-0">
                <td className="px-4 py-2">{cat}</td>
                <td className="px-4 py-2">{money(amt)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="px-4 py-2 font-medium">Total ({expenses.orderCount} orders)</td>
              <td className="px-4 py-2 font-bold">{money(expenses.total)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-500">Per order</td>
              <td className="px-4 py-2 text-gray-500">{expenses.perOrder != null ? money(expenses.perOrder) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function OrderStatsRow({ orderStats }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-6 text-sm">
      <div>
        <span className="text-gray-500">DPS orders: </span>
        <span className="font-medium">{orderStats.dps.orderCount}</span>
        <span className="text-gray-400"> · avg {orderStats.dps.avgOrderValue != null ? money(orderStats.dps.avgOrderValue) : '—'}</span>
      </div>
      <div>
        <span className="text-gray-500">ILS orders: </span>
        <span className="font-medium">{orderStats.ils.orderCount}</span>
        <span className="text-gray-400"> · avg {orderStats.ils.avgOrderValue != null ? money(orderStats.ils.avgOrderValue) : '—'}</span>
      </div>
    </div>
  );
}

function SummaryStrip({ report }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-6 text-sm">
      <div><span className="text-gray-500">Margin (DPS, computed): </span><span className="font-medium">{money(report.margin.dps)}</span></div>
      <div><span className="text-gray-500">Margin (ILS, computed): </span><span className="font-medium">{money(report.margin.ils)}</span></div>
      <div><span className="text-gray-500">Actual Margin: </span><span className="font-medium">{money(report.margin.actual)}</span></div>
      {(report.billing.credits > 0 || report.billing.debits > 0) && (
        <div className="text-gray-400">
          Billing credits {money(report.billing.credits)} · debits {money(report.billing.debits)}
        </div>
      )}
      <div><span className="text-gray-500">Total Expenses: </span><span className="font-medium">{money(report.expenses.total)}</span></div>
      <div className={report.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
        <span className="text-gray-500">Net Profit / Takehome: </span><span className="font-bold">{money(report.netProfit)}</span>
      </div>
    </div>
  );
}

const TOP_LAB_COLORS = ['#4a3aa7', '#e34948', '#eda100', '#e87ba4', '#008300'];

function TopLabsSection({ topLabsByVolume, topLabsByMargin }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Top Labs by Volume</h2>
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {topLabsByVolume.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No ILS activity this month.</p>
          ) : topLabsByVolume.map((l, i) => (
            <div key={l.partnerLabId} className="px-4 py-2 flex justify-between text-sm">
              <span><span className="text-gray-400 mr-2">#{i + 1}</span>{l.partnerLabName}</span>
              <span className="text-gray-500">{l.orderCount} orders</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Top Labs by Margin</h2>
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {topLabsByMargin.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No ILS activity this month.</p>
          ) : topLabsByMargin.map((l, i) => (
            <div key={l.partnerLabId} className="px-4 py-2 flex justify-between text-sm">
              <span><span className="text-gray-400 mr-2">#{i + 1}</span>{l.partnerLabName}</span>
              <span className="text-gray-500">{money(l.margin)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpenseCategoryTrendChart({ trend }) {
  const { data, config } = useMemo(() => {
    const categoryNames = [...new Set(trend.flatMap((m) => Object.keys(m.byCategory)))];
    const cfg = {};
    categoryNames.forEach((name, i) => {
      cfg[name] = { label: name, color: TOP_LAB_COLORS[i % TOP_LAB_COLORS.length] };
    });
    const chartData = trend.map((m) => ({
      month: new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      ...m.byCategory,
    }));
    return { data: chartData, config: cfg };
  }, [trend]);

  const categoryNames = Object.keys(config);
  const hasData = trend.some((m) => Object.keys(m.byCategory).length > 0);

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Expense Trend (last 6 months)</h2>
      <div className="bg-white rounded-xl shadow-sm border p-4">
        {!hasData ? (
          <p className="text-gray-400 text-sm py-10 text-center">Not enough expense history yet.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {categoryNames.map((name) => (
                <Bar key={name} dataKey={name} stackId="expenses" fill={config[name].color} radius={2} />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}

function DailySummaryCards({ report }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Revenue" value={money(report.revenue.total)} trendPct={report.trend.revenue} />
        <StatCard label="Billing" value={money(report.billing.actual)} trendPct={report.trend.billing} />
        <StatCard label="Expenses" value={money(report.expenses.total)} trendPct={report.trend.expenses} />
        <StatCard label="Profit" value={money(report.netProfit)} trendPct={report.trend.netProfit} tone={report.netProfit >= 0 ? 'good' : 'bad'} />
      </div>
      <p className="text-xs text-gray-400">
        Revenue: {money(report.revenue.dpsCollected)} DPS collected + {money(report.revenue.ilsReceived)} ILS received
        {' · '}Billing: {money(report.billing.computed)} computed
        {(report.billing.credits > 0 || report.billing.debits > 0) && (
          <> ({money(report.billing.credits)} credit − / {money(report.billing.debits)} debit +)</>
        )}
        {' · '}Margin (Revenue − Actual Billing): {money(report.margin.actual)}
      </p>
    </>
  );
}

function DailyTab() {
  const dispatch = useAppDispatch();
  const { daily: report, dailyLoading } = useAppSelector((s) => s.reports);
  const [date, setDate] = useState(today());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { dispatch(fetchDailyReport(date)); }, [dispatch, date]);

  return (
    <div className="space-y-5">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} className="border rounded px-3 py-1.5 text-sm" />
      {dailyLoading || !report ? <p className="text-gray-500 text-sm">Loading…</p> : (
        <>
          <DailySummaryCards report={report} />

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? '− Hide breakdown' : '+ Show breakdown (by lab, expense category, order stats)'}
          </button>

          {showDetails && (
            <div className="space-y-5">
              <OrderStatsRow orderStats={report.orderStats} />
              <IlsByLabTable labs={report.ilsByLab} />
              <ExpensesTable expenses={report.expenses} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WeeklyTab() {
  const dispatch = useAppDispatch();
  const { weekly: report, weeklyLoading } = useAppSelector((s) => s.reports);
  const [weekStart, setWeekStart] = useState(mondayOf(today()));

  useEffect(() => { dispatch(fetchWeeklyReport(weekStart)); }, [dispatch, weekStart]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>← Prev week</Button>
        <span className="text-sm text-gray-600">
          {report ? `${formatDate(report.weekStart)} – ${formatDate(report.weekEnd)}` : '—'}
        </span>
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          disabled={addDays(weekStart, 7) > mondayOf(today())}
        >
          Next week →
        </Button>
      </div>
      {weeklyLoading || !report ? <p className="text-gray-500 text-sm">Loading…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="DPS Collected" value={money(report.revenue.dpsCollected)} />
            <StatCard label="ILS Received" value={money(report.revenue.ilsReceived)} />
            <StatCard label="Total Revenue" value={money(report.revenue.total)} trendPct={report.trend.revenue} />
            <StatCard label="Net Profit" value={money(report.netProfit)} trendPct={report.trend.netProfit} tone={report.netProfit >= 0 ? 'good' : 'bad'} />
          </div>
          <OrderStatsRow orderStats={report.orderStats} />
          <IlsByLabTable labs={report.ilsByLab} />
          <ExpensesTable expenses={report.expenses} />
          <SummaryStrip report={report} />
        </>
      )}
    </div>
  );
}

function MonthlyTab() {
  const dispatch = useAppDispatch();
  const { monthly: report, loading } = useAppSelector((s) => s.reports);
  const [month, setMonth] = useState(currentMonth());

  useEffect(() => { dispatch(fetchMonthlyReport(month)); }, [dispatch, month]);

  return (
    <div className="space-y-6">
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
      {loading || !report ? <p className="text-gray-500 text-sm">Loading…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="DPS Collected" value={money(report.revenue.dpsCollected)} />
            <StatCard label="ILS Received" value={money(report.revenue.ilsReceived)} />
            <StatCard label="Total Revenue" value={money(report.revenue.total)} trendPct={report.trend.revenue} />
            <StatCard label="Net Profit / Takehome" value={money(report.netProfit)} trendPct={report.trend.netProfit} tone={report.netProfit >= 0 ? 'good' : 'bad'} />
          </div>
          <OrderStatsRow orderStats={report.orderStats} />
          <IlsByLabTable labs={report.ilsByLab} />
          <TopLabsSection topLabsByVolume={report.topLabsByVolume} topLabsByMargin={report.topLabsByMargin} />
          <ExpensesTable expenses={report.expenses} />
          <ExpenseCategoryTrendChart trend={report.expenseCategoryTrend} />
          <SummaryStrip report={report} />
        </>
      )}
    </div>
  );
}

const TABS = [
  { key: 'daily',   label: 'Daily' },
  { key: 'weekly',  label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('daily');

  return (
    <div>
      <div className="flex gap-1 mb-5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'daily' && <DailyTab />}
      {tab === 'weekly' && <WeeklyTab />}
      {tab === 'monthly' && <MonthlyTab />}
    </div>
  );
}
