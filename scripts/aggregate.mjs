import duckdb from "@duckdb/node-api";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const srcDataRoot = join(repoRoot, "src", "data");
const sourceRoot = join(repoRoot, "nibrs-data");

const YEAR_REGEX = /^NY-(\d{4})$/;

const NYC_COUNTY_KEYS = ["BRONX", "KINGS", "NEW YORK", "QUEENS", "RICHMOND"];
const NYPD_AGENCY_ID = "13274";

function listYearDirs() {
  if (!existsSync(sourceRoot)) return [];
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => YEAR_REGEX.test(name))
    .sort();
}

function sqlStringLiteral(p) {
  return `'${String(p).replaceAll("'", "''")}'`;
}

/** strftime %m → nuqs month key "1" … "12" */
function monthKeyFromMm(mm) {
  const n = Number.parseInt(String(mm ?? "0"), 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return String(n);
}

function addNypdToNycBoroughs(counts, nypdTotal) {
  if (nypdTotal <= 0) return;
  for (const k of NYC_COUNTY_KEYS) {
    counts[k] = (counts[k] ?? 0) + nypdTotal;
  }
}

const CELL_SEP = "\x1f";

/**
 * @param {Map<string, Map<string, number>>} countyByCell
 * @param {Map<string, number>} nypdByCell
 */
function cellsToNested(countyByCell, nypdByCell) {
  /** @type {Record<string, Record<string, Record<string, number>>>} */
  const byMonthOffense = {};
  for (const [cellKey, countyMap] of countyByCell) {
    const sep = cellKey.indexOf(CELL_SEP);
    const month = sep === -1 ? "all" : cellKey.slice(0, sep);
    const offense = sep === -1 ? "all" : cellKey.slice(sep + CELL_SEP.length);
    const merged = Object.fromEntries(countyMap);
    addNypdToNycBoroughs(merged, nypdByCell.get(cellKey) ?? 0);
    if (!byMonthOffense[month]) byMonthOffense[month] = {};
    byMonthOffense[month][offense] = merged;
  }
  return byMonthOffense;
}

async function aggregateYear(conn, incidentCsv, offenseCsv, agenciesCsv) {
  const sql = `
    SELECT
      o.offense_code::VARCHAR AS offense_code,
      strftime('%m', CAST(i.incident_date AS DATE)) AS mm,
      upper(trim(a.county_name::VARCHAR)) AS county,
      i.agency_id::VARCHAR AS agency_id
    FROM read_csv_auto(${sqlStringLiteral(offenseCsv)}, header = true) o
    INNER JOIN read_csv_auto(${sqlStringLiteral(incidentCsv)}, header = true) i
      ON o.incident_id = i.incident_id
    INNER JOIN read_csv_auto(${sqlStringLiteral(agenciesCsv)}, header = true) a
      ON i.agency_id = a.agency_id
  `;

  const res = await conn.runAndReadAll(sql);
  const rows = res.getRows();

  /** @type {Map<string, Map<string, number>>} */
  const countyByCell = new Map();
  /** @type {Map<string, number>} */
  const nypdByCell = new Map();

  function bump(cellKey, county, delta) {
    if (!countyByCell.has(cellKey)) countyByCell.set(cellKey, new Map());
    const m = countyByCell.get(cellKey);
    m.set(county, (m.get(county) ?? 0) + delta);
  }

  function bumpNypd(cellKey, delta) {
    nypdByCell.set(cellKey, (nypdByCell.get(cellKey) ?? 0) + delta);
  }

  for (const row of rows) {
    const offenseCode = row[0] != null ? String(row[0]) : "";
    const mm = row[1];
    const countyRaw = row[2] != null ? String(row[2]).trim() : "";
    const agencyId = row[3] != null ? String(row[3]) : "";
    const county = countyRaw.length > 0 ? countyRaw : "UNKNOWN";
    const mk = monthKeyFromMm(mm);
    if (!mk || !offenseCode) continue;

    const keys = [
      ["all", "all"],
      ["all", offenseCode],
      [mk, "all"],
      [mk, offenseCode],
    ];

    for (const [monthKey, offKey] of keys) {
      const cellKey = `${monthKey}${CELL_SEP}${offKey}`;
      bump(cellKey, county, 1);
      if (agencyId === NYPD_AGENCY_ID) bumpNypd(cellKey, 1);
    }
  }

  return cellsToNested(countyByCell, nypdByCell);
}

async function main() {
  const yearDirs = listYearDirs();
  if (yearDirs.length === 0) {
    console.warn(`[aggregate] No ${sourceRoot} year folders found; skipping.`);
    return;
  }

  ensureDirExists(srcDataRoot);

  const db = await duckdb.DuckDBInstance.create(":memory:");
  const conn = await db.connect();
  try {
    for (const dirName of yearDirs) {
      const year = dirName.match(YEAR_REGEX)[1];
      const inDir = join(sourceRoot, dirName);
      const incidentCsv = join(inDir, "NIBRS_incident.csv");
      const offenseCsv = join(inDir, "NIBRS_OFFENSE.csv");
      const agenciesCsv = join(inDir, "agencies.csv");
      if (!existsSync(incidentCsv) || !existsSync(offenseCsv) || !existsSync(agenciesCsv)) {
        console.warn(`[aggregate] Skip ${dirName}: missing CSVs`);
        continue;
      }
      console.log(`[aggregate] Processing NY-${year}…`);
      const byMonthOffense = await aggregateYear(conn, incidentCsv, offenseCsv, agenciesCsv);

      const yearDir = join(srcDataRoot, year);
      ensureDirExists(yearDir);
      const outPath = join(yearDir, "stats.json");
      const payload = {
        generatedAt: new Date().toISOString(),
        byMonthOffense,
      };
      writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
      console.log(`[county-offense-aggregate] Wrote ${outPath}`);
    }
  } finally {
    conn.closeSync();
    db.closeSync();
  }
}

function ensureDirExists(p) {
  mkdirSync(p, { recursive: true });
}

await main();
