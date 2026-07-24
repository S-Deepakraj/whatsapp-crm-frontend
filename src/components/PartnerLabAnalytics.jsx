import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis,
} from 'recharts';
import api from '../services/api';
import { Button } from './ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart';
import { buildDpsLabSegments } from '../utils/partnerLabColors';

const CHART_CONFIG = {
  revenue: { label: 'Collected',  theme: { light: '#2a78d6', dark: '#3987e5' } },
  cost:    { label: 'B2B Cost',   theme: { light: '#eb6834', dark: '#d95926' } },
};

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const RANGES = [
  { label: 'Last 7 days',  startDate: () => isoDaysAgo(6) },
  { label: 'Last 30 days', startDate: () => isoDaysAgo(29) },
  { label: 'This month',   startDate: monthStart },
];

function formatDateLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatRupee(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export default function PartnerLabAnalytics() {
  const [rangeIndex, setRangeIndex] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const range = RANGES[rangeIndex];

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/partner-lab-stats', {
      params: { startDate: range.startDate(), endDate: todayStr() },
    }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [rangeIndex]);

  const byDateChartData = useMemo(
    () => (data?.byDate ?? []).map((d) => ({ ...d, label: formatDateLabel(d.date) })),
    [data]
  );
  const byLabChartData = useMemo(
    () => (data?.byLab ?? []).map((l) => ({ ...l, label: l.partnerLabName })),
    [data]
  );
  const labShare = useMemo(() => buildDpsLabSegments(0, data?.byLab ?? [], 'revenue'), [data]);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Partner Lab (ILS) Analytics</h2>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <Button
              key={r.label}
              size="sm"
              variant={rangeIndex === i ? 'default' : 'outline'}
              onClick={() => setRangeIndex(i)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : data.summary.orderCount === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center bg-white rounded-xl border">
          No ILS orders in this range yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl p-5 bg-blue-50">
              <p className="text-3xl font-bold text-blue-700">{formatRupee(data.summary.revenue)}</p>
              <p className="text-sm text-gray-600 mt-1">Collected from partner labs</p>
            </div>
            <div className="rounded-xl p-5 bg-orange-50">
              <p className="text-3xl font-bold text-orange-700">{formatRupee(data.summary.cost)}</p>
              <p className="text-sm text-gray-600 mt-1">B2B cost</p>
            </div>
            <div className="rounded-xl p-5 bg-green-50">
              <p className="text-3xl font-bold text-green-700">{formatRupee(data.summary.margin)}</p>
              <p className="text-sm text-gray-600 mt-1">Margin · {data.summary.orderCount} orders</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Trend over time</p>
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-64 w-full">
              <LineChart data={byDateChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={(v) => `₹${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 3 }} />
                <Line dataKey="cost" type="monotone" stroke="var(--color-cost)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">By partner lab — collected vs cost</p>
              <ChartContainer config={CHART_CONFIG} className="aspect-auto h-64 w-full">
                <BarChart data={byLabChartData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={(v) => `₹${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Revenue share by partner lab</p>
              {labShare.data.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No revenue in this range yet.</p>
              ) : (
                <ChartContainer config={labShare.config} className="aspect-auto h-64 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={labShare.data}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="#fff"
                      label={({ value }) => formatRupee(value)}
                    >
                      {labShare.data.map((d) => <Cell key={d.key} fill={d.fill} />)}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
