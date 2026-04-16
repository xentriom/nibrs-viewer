import { searchParamsCache } from "~/lib/search-params";
import {
  getMonthlyTotalsForOffenseCodes,
  getTopOffenseCodesCommonAcrossYears,
} from "~/lib/offense-counts";
import { offenseNamesByYearAndCode } from "~/lib/options.generated";
import TrendChartClient from "./trend-chart-client";

export default async function TrendChart() {
  const year = searchParamsCache.get("year");
  const yearKey = String(year) as keyof typeof offenseNamesByYearAndCode;

  const offenseCodes = await getTopOffenseCodesCommonAcrossYears(5);
  const raw = await getMonthlyTotalsForOffenseCodes(String(year), offenseCodes);

  const series = offenseCodes.map((code, idx) => {
    const key = `s${idx + 1}`;
    const nameMap = offenseNamesByYearAndCode[yearKey] as Record<string, string> | undefined;
    const name = nameMap?.[code] ?? code;
    return {
      key,
      code,
      label: `${code} - ${name}`,
      color: `var(--chart-${idx + 1})`,
    };
  });

  const data = raw.map((p) => {
    const row: Record<string, unknown> = { date: p.date };
    for (const s of series) {
      row[s.key] = p.totalsByCode[s.code] ?? 0;
    }
    return row as { date: string } & Record<string, number>;
  });

  return <TrendChartClient data={data} series={series} />;
}
