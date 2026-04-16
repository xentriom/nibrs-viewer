import duckdb from "@duckdb/node-api";
import { mkdirSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const sourceRoot = join(repoRoot, "nibrs-data");
const outRoot = join(repoRoot, "src", "data");

const YEAR_REGEX = /^NY-(\d{4})$/;

function ensureDirExists(p) {
  mkdirSync(p, { recursive: true });
}

// List available source year folders under ./nibrs-data.
function listSourceYearDirs() {
  if (!existsSync(sourceRoot)) return [];
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => YEAR_REGEX.test(name))
    .sort();
}

// Extract YYYY from "NY-YYYY".
function parseYearFromDirName(dirName) {
  const m = dirName.match(YEAR_REGEX);
  if (!m) throw new Error(`Unexpected year dir name: ${dirName}`);
  return m[1];
}

function sqlStringLiteral(p) {
  // DuckDB string literal escaping.
  return `'${String(p).replaceAll("'", "''")}'`;
}

async function openDuckDbConnection() {
  const db = await duckdb.DuckDBInstance.create(":memory:");
  return await db.connect();
}

async function queryRows(conn, sql) {
  const res = await conn.runAndReadAll(sql);
  return res.getRows().map((row) => row.map((cell) => cell?.toString?.() ?? String(cell)));
}

function rowsToObjects(rows, keys) {
  return rows.map((r) => {
    const o = {};
    for (let i = 0; i < keys.length; i++) o[keys[i]] = r[i] ?? null;
    return o;
  });
}

async function main() {
  ensureDirExists(outRoot);

  const years = listSourceYearDirs();
  if (years.length === 0) {
    console.warn(`No year folders found under ${sourceRoot}`);
    return;
  }

  const conn = await openDuckDbConnection();

  // Export each year's CSVs as JSON arrays
  for (const yearDirName of years) {
    const year = parseYearFromDirName(yearDirName);
    const inDir = join(sourceRoot, yearDirName);
    const outDir = join(outRoot, year);
    ensureDirExists(outDir);

    const incidentCsv = join(inDir, "NIBRS_incident.csv");
    const offenseCsv = join(inDir, "NIBRS_OFFENSE.csv");
    const offenseTypeCsv = join(inDir, "NIBRS_OFFENSE_TYPE.csv");
    const agenciesCsv = join(inDir, "agencies.csv");

    const agenciesJson = join(outDir, "agencies.json");
    const incidentsJson = join(outDir, "incidents.json");
    const offensesJson = join(outDir, "offenses.json");
    const offenseTypesJson = join(outDir, "offenseTypes.json");

    const agenciesRows = await queryRows(
      conn,
      `
        select
          a.agency_id::varchar as agencyId,
          a.ncic_agency_name::varchar as agencyName,
          a.county_name::varchar as county
        from read_csv_auto(${sqlStringLiteral(agenciesCsv)}, header=true) a
        order by 1
      `,
    );

    const incidentRows = await queryRows(
      conn,
      `
        select
          i.agency_id::varchar as agencyId,
          i.incident_id::varchar as incidentId,
          i.incident_date::varchar as incidentDate
        from read_csv_auto(${sqlStringLiteral(incidentCsv)}, header=true) i
      `,
    );

    const offenseRows = await queryRows(
      conn,
      `
        select
          o.incident_id::varchar as incidentId,
          o.offense_id::varchar as offenseId,
          o.offense_code::varchar as offenseCode
        from read_csv_auto(${sqlStringLiteral(offenseCsv)}, header=true) o
      `,
    );

    const offenseTypeRows = await queryRows(
      conn,
      `
        select
          offense_code::varchar as offenseCode,
          offense_name::varchar as offenseName,
          offense_category_name::varchar as offenseCategoryName,
          offense_group::varchar as offenseGroup
        from read_csv_auto(${sqlStringLiteral(offenseTypeCsv)}, header=true)
        order by 1
      `,
    );

    writeFileSync(
      agenciesJson,
      JSON.stringify(rowsToObjects(agenciesRows, ["agencyId", "agencyName", "county"]), null, 2),
    );

    writeFileSync(
      incidentsJson,
      JSON.stringify(
        rowsToObjects(incidentRows, ["agencyId", "incidentId", "incidentDate"]),
        null,
        2,
      ),
    );

    writeFileSync(
      offensesJson,
      JSON.stringify(
        rowsToObjects(offenseRows, ["incidentId", "offenseId", "offenseCode"]),
        null,
        2,
      ),
    );

    writeFileSync(
      offenseTypesJson,
      JSON.stringify(
        rowsToObjects(offenseTypeRows, [
          "offenseCode",
          "offenseName",
          "offenseCategoryName",
          "offenseGroup",
        ]),
        null,
        2,
      ),
    );

    console.log(`[Convert] Successfully converted ${year}`);
  }

  const manifestPath = join(outRoot, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        years: years.map(parseYearFromDirName),
      },
      null,
      2,
    ),
  );

  console.log(`[Convert] Generated ${years.length} years of datasets`);
}

await main();
