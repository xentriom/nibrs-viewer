import { mkdir, open, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import type { NibrsManifest, NibrsYearDataset } from "../types/nibrs.ts";

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, "data");
const PUBLIC_DATA_ROOT = path.join(ROOT, "public", "data");

const YEARS = [2020, 2021, 2022, 2023, 2024] as const;
type RowObject = Record<string, unknown>;

async function ensureOutputFolders() {
  await rm(path.join(PUBLIC_DATA_ROOT, "years"), { recursive: true, force: true });
  await mkdir(PUBLIC_DATA_ROOT, { recursive: true });
}

async function createConnection() {
  const instance = await DuckDBInstance.create(":memory:", {
    threads: "8",
  });
  const connection = await instance.connect();
  await connection.run("SET preserve_insertion_order = false");
  await connection.run("SET memory_limit = '4096MB'");
  return connection;
}

function getSourceFile(year: number, fileName: string) {
  return path.join(DATA_ROOT, `NY-${year}`, fileName);
}

function toSqlStringLiteral(value: string) {
  return `'${value.replaceAll("\\", "/").replaceAll("'", "''")}'`;
}

async function readCsvHeaderMap(filePath: string) {
  const file = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(16_384);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const firstChunk = buffer.subarray(0, bytesRead).toString("utf8");
    const headerLine = firstChunk.split(/\r?\n/, 1)[0] ?? "";
    const headers = headerLine.split(",").map((header) => header.trim().replace(/^"|"$/g, ""));

    return new Map(headers.map((header) => [header.toLowerCase(), header]));
  } finally {
    await file.close();
  }
}

function getColumn(headerMap: Map<string, string>, columnName: string) {
  const column = headerMap.get(columnName.toLowerCase());

  if (!column) {
    throw new Error(`Missing column "${columnName}" in source CSV.`);
  }

  return `"${column}"`;
}

function getColumnIfExists(headerMap: Map<string, string>, columnName: string) {
  const column = headerMap.get(columnName.toLowerCase());
  return column ? `"${column}"` : null;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value ?? 0);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

async function buildYearDataset(year: number): Promise<NibrsYearDataset> {
  const connection = await createConnection();
  try {
    const generatedAt = new Date().toISOString();

    const incidentsPath = getSourceFile(year, "NIBRS_incident.csv");
    const offensePath = getSourceFile(year, "NIBRS_OFFENSE.csv");
    const offenseTypePath = getSourceFile(year, "NIBRS_OFFENSE_TYPE.csv");
    const agenciesPath = getSourceFile(year, "agencies.csv");
    const incidentHeaders = await readCsvHeaderMap(incidentsPath);
    const offenseHeaders = await readCsvHeaderMap(offensePath);
    const offenseTypeHeaders = await readCsvHeaderMap(offenseTypePath);
    const agenciesHeaders = await readCsvHeaderMap(agenciesPath);

    const offenseJoinKey =
      getColumnIfExists(offenseHeaders, "offense_code") ??
      getColumn(offenseHeaders, "offense_type_id");
    const offenseCodeColumn = getColumnIfExists(offenseHeaders, "offense_code");
    const offenseTypeJoinKey = offenseCodeColumn
      ? getColumn(offenseTypeHeaders, "offense_code")
      : getColumn(offenseTypeHeaders, "offense_type_id");

    await connection.run(`
      CREATE OR REPLACE VIEW incidents AS
      SELECT
        ${getColumn(incidentHeaders, "agency_id")} AS agency_id,
        ${getColumn(incidentHeaders, "incident_id")} AS incident_id,
        COALESCE(
          TRY_CAST(${getColumn(incidentHeaders, "incident_date")} AS DATE),
          TRY_STRPTIME(${getColumn(incidentHeaders, "incident_date")}, '%d-%b-%y')
        ) AS incident_date
      FROM read_csv(${toSqlStringLiteral(incidentsPath)}, header = true, all_varchar = true)
    `);

    await connection.run(`
      CREATE OR REPLACE VIEW offense AS
      SELECT
        ${getColumn(offenseHeaders, "incident_id")} AS incident_id,
        ${offenseJoinKey} AS offense_join_key,
        ${offenseCodeColumn ?? "NULL"} AS offense_code
      FROM read_csv(${toSqlStringLiteral(offensePath)}, header = true, all_varchar = true)
    `);

    await connection.run(`
      CREATE OR REPLACE VIEW offense_type AS
      SELECT
        ${offenseTypeJoinKey} AS offense_join_key,
        ${getColumn(offenseTypeHeaders, "offense_code")} AS offense_code,
        ${getColumn(offenseTypeHeaders, "offense_name")} AS offense_name,
        ${getColumn(offenseTypeHeaders, "offense_category_name")} AS offense_category_name,
        ${getColumn(offenseTypeHeaders, "offense_group")} AS offense_group,
        ${getColumn(offenseTypeHeaders, "crime_against")} AS crime_against
      FROM read_csv(${toSqlStringLiteral(offenseTypePath)}, header = true, all_varchar = true)
    `);

    await connection.run(`
      CREATE OR REPLACE VIEW agencies AS
      SELECT
        ${getColumn(agenciesHeaders, "agency_id")} AS agency_id,
        ${getColumn(agenciesHeaders, "pub_agency_name")} AS pub_agency_name,
        ${getColumn(agenciesHeaders, "county_name")} AS county_name
      FROM read_csv(${toSqlStringLiteral(agenciesPath)}, header = true, all_varchar = true)
    `);

    const recordsResult = await connection.run(`
      WITH joined AS (
        SELECT
          EXTRACT(MONTH FROM incident_date)::INTEGER AS month,
          i.agency_id AS agency_id,
          COALESCE(a.pub_agency_name, 'Unknown agency') AS agency_name,
          COALESCE(a.county_name, 'Unknown county') AS county_name,
          COALESCE(o.offense_code, ot.offense_code) AS offense_code,
          COALESCE(ot.offense_name, 'Unknown offense') AS offense_name,
          COALESCE(ot.offense_category_name, 'Unknown category') AS offense_category_name,
          COALESCE(ot.offense_group, '?') AS offense_group,
          COALESCE(ot.crime_against, 'Unknown') AS crime_against,
          i.incident_id AS incident_id
        FROM incidents i
        JOIN offense o USING (incident_id)
        LEFT JOIN offense_type ot USING (offense_join_key)
        LEFT JOIN agencies a USING (agency_id)
        WHERE incident_date IS NOT NULL
      )
      SELECT
        month,
        agency_id,
        agency_name,
        county_name,
        offense_code,
        offense_name,
        offense_category_name,
        offense_group,
        crime_against,
        COUNT(DISTINCT incident_id) AS incident_count,
        COUNT(*) AS offense_count
      FROM joined
      GROUP BY 1,2,3,4,5,6,7,8,9
      ORDER BY month, offense_count DESC, agency_name, offense_code
    `);

    const rawRecords = (await recordsResult.getRowObjectsJson()) as RowObject[];
    const records = rawRecords.map((row) => ({
      month: normalizeNumber(row.month),
      agencyId: normalizeString(row.agency_id),
      agencyName: normalizeString(row.agency_name),
      countyName: normalizeString(row.county_name),
      offenseCode: normalizeString(row.offense_code),
      offenseName: normalizeString(row.offense_name),
      offenseCategoryName: normalizeString(row.offense_category_name),
      offenseGroup: normalizeString(row.offense_group),
      crimeAgainst: normalizeString(row.crime_against),
      incidentCount: normalizeNumber(row.incident_count),
      offenseCount: normalizeNumber(row.offense_count),
    }));

    const monthlyTrendMap = new Map<number, { incidentCount: number; offenseCount: number }>();
    const agencyMap = new Map<string, NibrsYearDataset["agencyBreakdown"][number]>();
    const offenseMap = new Map<string, NibrsYearDataset["offenseBreakdown"][number]>();

    for (const record of records) {
      const monthEntry = monthlyTrendMap.get(record.month) ?? { incidentCount: 0, offenseCount: 0 };
      monthEntry.incidentCount += record.incidentCount;
      monthEntry.offenseCount += record.offenseCount;
      monthlyTrendMap.set(record.month, monthEntry);

      const agencyEntry = agencyMap.get(record.agencyId) ?? {
        agencyId: record.agencyId,
        agencyName: record.agencyName,
        countyName: record.countyName,
        incidentCount: 0,
        offenseCount: 0,
      };
      agencyEntry.incidentCount += record.incidentCount;
      agencyEntry.offenseCount += record.offenseCount;
      agencyMap.set(record.agencyId, agencyEntry);

      const offenseEntry = offenseMap.get(record.offenseCode) ?? {
        offenseCode: record.offenseCode,
        offenseName: record.offenseName,
        offenseCategoryName: record.offenseCategoryName,
        offenseGroup: record.offenseGroup,
        crimeAgainst: record.crimeAgainst,
        incidentCount: 0,
        offenseCount: 0,
      };
      offenseEntry.incidentCount += record.incidentCount;
      offenseEntry.offenseCount += record.offenseCount;
      offenseMap.set(record.offenseCode, offenseEntry);
    }

    const monthlyTrend = [...monthlyTrendMap.entries()]
      .map(([month, value]) => ({
        month,
        incidentCount: value.incidentCount,
        offenseCount: value.offenseCount,
      }))
      .sort((a, b) => a.month - b.month);

    const agencyBreakdown = [...agencyMap.values()].sort((a, b) => b.offenseCount - a.offenseCount);
    const offenseBreakdown = [...offenseMap.values()].sort(
      (a, b) => b.offenseCount - a.offenseCount,
    );

    const countsResult = await connection.run(`
      SELECT
        (SELECT COUNT(*) FROM agencies) AS agencies,
        (SELECT COUNT(*) FROM incidents) AS incidents,
        (SELECT COUNT(*) FROM offense) AS offenses
    `);
    const [counts] = (await countsResult.getRowObjectsJson()) as RowObject[];

    return {
      year,
      generatedAt,
      summary: {
        agencies: normalizeNumber(counts.agencies),
        incidents: normalizeNumber(counts.incidents),
        offenses: normalizeNumber(counts.offenses),
        topAgency: agencyBreakdown[0] ?? null,
        topOffense: offenseBreakdown[0] ?? null,
      },
      monthlyTrend,
      agencyBreakdown,
      offenseBreakdown,
      records,
    };
  } finally {
    connection.closeSync();
  }
}

async function main() {
  await ensureOutputFolders();

  const manifest: NibrsManifest = {
    generatedAt: new Date().toISOString(),
    years: [],
  };

  for (const year of YEARS) {
    const dataset = await buildYearDataset(year);
    const relativePath = `/data/${year}.json`;
    await writeJson(path.join(PUBLIC_DATA_ROOT, `${year}.json`), dataset);

    manifest.years.push({
      year,
      path: relativePath,
      agencies: dataset.summary.agencies,
      incidents: dataset.summary.incidents,
      offenses: dataset.summary.offenses,
      updatedAt: dataset.generatedAt,
    });

    console.log(`Built ${year}: ${dataset.records.length.toLocaleString()} grouped rows`);
  }

  await writeJson(path.join(PUBLIC_DATA_ROOT, "manifest.json"), manifest);
  console.log(`Manifest built: ${manifest.years.length} years`);
}

await main();
