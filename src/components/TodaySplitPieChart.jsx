import { useMemo } from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart';
import { buildDpsLabSegments } from '../utils/partnerLabColors';

function formatRupee(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export default function TodaySplitPieChart({ title, dps, byLab, valueKey }) {
  const { data, config } = useMemo(() => buildDpsLabSegments(dps, byLab, valueKey), [dps, byLab, valueKey]);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-2">Today · {formatRupee(total)} total</p>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No data for today yet.</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={50}
              outerRadius={80}
              strokeWidth={2}
              stroke="#fff"
              label={({ value }) => formatRupee(value)}
            >
              {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      )}
    </div>
  );
}
