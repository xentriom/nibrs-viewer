"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";

export type TrendSeries = {
  key: string; // s1..s5
  code: string; // offense code (e.g. 13B)
  label: string; // legend label
  color: string; // css color
};

export default function TrendChartClient({
  data,
  series,
}: {
  data: Array<{ date: string } & Record<string, number>>;
  series: TrendSeries[];
}) {
  const formatMonthUtc = (value: unknown) => {
    const date = new Date(String(value));
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  };

  const chartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <AreaChart data={data}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatMonthUtc}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" labelFormatter={formatMonthUtc} />}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="natural"
            stroke={s.color}
            fill={`url(#fill-${s.key})`}
            stackId="a"
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
