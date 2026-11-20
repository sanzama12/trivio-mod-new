/** Data-only SQL backups; no JSON files are required by the migration workflow. */
export interface DatabaseSnapshot {
  format: number;
  createdAt: string;
  applied: string[];
  tables: Record<string, unknown[]>;
}
const identifier = (value: string) => '"' + value.replaceAll('"', '""') + '"';

export function snapshotSql(snapshot: DatabaseSnapshot, columns: Record<string, string[]>): string {
  const { tables, ...metadata } = snapshot;
  const lines = [
    "-- Trovio data-only backup. Restore into an EMPTY, matching schema in an isolated database.",
    `-- trovio-snapshot: ${Buffer.from(JSON.stringify(metadata)).toString("base64")}`,
    "BEGIN;", "SET LOCAL standard_conforming_strings = on;",
  ];
  for (const [table, rows] of Object.entries(tables)) {
    if (!rows.length) continue;
    const names = columns[table];
    if (!names?.length) throw new Error(`Missing backup column metadata: ${table}`);
    const selected = names.map(identifier).join(",");
    const data = JSON.stringify(rows).replaceAll("'", "''");
    const target = `"trovio".${identifier(table)}`;
    lines.push(`INSERT INTO ${target} (${selected}) OVERRIDING SYSTEM VALUE SELECT ${selected} FROM jsonb_populate_recordset(NULL::${target}, '${data}'::jsonb);`);
  }
  lines.push("COMMIT;", "");
  return lines.join("\n");
}

/** Decode our own snapshot format for migration rehearsals; never execute backup SQL here. */
export function parseSnapshotSql(sql: string): DatabaseSnapshot {
  const metadata = sql.match(/^-- trovio-snapshot: ([A-Za-z0-9+/=]+)$/m)?.[1];
  if (!metadata) throw new Error("Not a Trovio SQL data snapshot.");
  const parsed = JSON.parse(Buffer.from(metadata, "base64").toString("utf8"));
  if (parsed.format !== 1 || !Array.isArray(parsed.applied)) throw new Error("Unsupported snapshot metadata.");
  const tables: Record<string, unknown[]> = {};
  const pattern = /FROM jsonb_populate_recordset\(NULL::"trovio"\."((?:[^"]|"")*)", '((?:[^']|'')*)'::jsonb\);/g;
  for (const match of sql.matchAll(pattern)) {
    const table = match[1].replaceAll('""', '"');
    const records: unknown = JSON.parse(match[2].replaceAll("''", "'"));
    if (!Array.isArray(records)) throw new Error("Invalid snapshot records.");
    tables[table] = records;
  }
  return { ...parsed, tables };
}
