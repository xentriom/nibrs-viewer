import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { SearchParams } from "./search-configs";
import { yearOptions } from "./options.generated";

export type YearStatsFile = {
  generatedAt: string;
  byMonthOffense: Record<string, Record<string, Record<string, number>>>;
};

const statsCache = new Map<string, YearStatsFile>();
const offenseTypesCache = new Map<string, Map<string, "A" | "B">>();

function loadYearStats(year: string) {
  const cached = statsCache.get(year);
  if (cached) return cached;

  const path = join(process.cwd(), "src", "data", year, "stats.json");
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as YearStatsFile;
  statsCache.set(year, data);
  return data;
}

function sumCountyCounts(byCounty: unknown) {
  if (!byCounty || typeof byCounty !== "object") return 0;
  let sum = 0;
  for (const n of Object.values(byCounty as Record<string, unknown>)) {
    const num = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(num)) continue;
    sum += num;
  }
  return sum;
}

function loadOffenseGroupByCode(year: string) {
  const cached = offenseTypesCache.get(year);
  if (cached) return cached;

  const path = join(process.cwd(), "src", "data", year, "offenseTypes.json");
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as Array<{ offenseCode: string; offenseGroup: "A" | "B" }>;

  const out = new Map<string, "A" | "B">();
  for (const item of data) {
    if (!item?.offenseCode || (item.offenseGroup !== "A" && item.offenseGroup !== "B")) continue;
    out.set(item.offenseCode, item.offenseGroup);
  }

  offenseTypesCache.set(year, out);
  return out;
}

export async function getOffenseCountByCounty(params: SearchParams) {
  const year = String(params.year);
  const month = params.month;
  const offenseCode = params.offenseCode;

  const stats = loadYearStats(year);
  if (!stats) return new Map();

  const byMonth = stats.byMonthOffense[month];
  if (!byMonth) return new Map();

  const byCounty = byMonth[offenseCode];
  if (!byCounty || typeof byCounty !== "object") return new Map();

  const out = new Map<string, number>();
  for (const [county, n] of Object.entries(byCounty)) {
    const num = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(num)) continue;
    out.set(county, num);
  }
  return out;
}

function getAvailableYears() {
  return yearOptions.map(String).filter((y) => loadYearStats(String(y)));
}

export async function getTopOffenseCodesCommonAcrossYears(limit = 5): Promise<string[]> {
  const years = getAvailableYears();
  if (years.length === 0) return [];

  let commonCodes: Set<string> | null = null;
  const totals = new Map<string, number>();

  for (const year of years) {
    const stats = loadYearStats(year);
    const byAllMonth = stats?.byMonthOffense?.["all"];
    if (!stats || !byAllMonth || typeof byAllMonth !== "object") continue;

    const codesThisYear = new Set(
      Object.keys(byAllMonth).filter((code) => code && code !== "all" && code !== "23*"),
    );

    if (!commonCodes) {
      commonCodes = codesThisYear;
    } else {
      const next = new Set<string>();
      for (const c of commonCodes) {
        if (codesThisYear.has(c)) next.add(c);
      }
      commonCodes = next;
    }

    for (const code of codesThisYear) {
      const total = sumCountyCounts((byAllMonth as Record<string, unknown>)[code]);
      totals.set(code, (totals.get(code) ?? 0) + total);
    }
  }

  if (!commonCodes || commonCodes.size === 0) return [];

  return [...commonCodes]
    .map((code) => ({ code, total: totals.get(code) ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, limit))
    .map((x) => x.code);
}

export type MonthlyTotalsPoint = {
  date: string;
  totalsByCode: Record<string, number>;
};

export async function getMonthlyTotalsForOffenseCodes(
  year: string,
  offenseCodes: string[],
): Promise<MonthlyTotalsPoint[]> {
  const stats = loadYearStats(year);
  if (!stats) return [];

  const out: MonthlyTotalsPoint[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthKey = String(month);
    const byMonth = stats.byMonthOffense[monthKey];
    const byMonthSafe: Record<string, unknown> =
      byMonth && typeof byMonth === "object" ? (byMonth as Record<string, unknown>) : {};

    const mm = String(month).padStart(2, "0");
    const totalsByCode: Record<string, number> = {};

    for (const code of offenseCodes) {
      const byCounty = byMonthSafe[code];
      totalsByCode[code] = sumCountyCounts(byCounty);
    }

    out.push({ date: `${year}-${mm}-01T00:00:00.000Z`, totalsByCode });
  }

  return out;
}
