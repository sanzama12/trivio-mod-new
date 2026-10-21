import { readFileSync } from "node:fs";
import { join } from "node:path";

/** One SQL file, with stable per-migration IDs matching schema_migrations. */
export function readMigrations(): Map<string, string> {
  const bundle = readFileSync(join(process.cwd(), "database/migrations/all.sql"), "utf8");
  const markers = [...bundle.matchAll(/^-- @migration ([0-9]{8}_[a-z0-9_]+\.sql)\r?$/gm)];
  if (!markers.length) throw new Error("Migration bundle has no migration markers.");
  const result = new Map<string, string>();
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const name = marker[1];
    if (result.has(name)) throw new Error(`Duplicate migration ID: ${name}`);
    const sql = bundle.slice(marker.index! + marker[0].length, markers[i + 1]?.index ?? bundle.length).trim();
    if (!sql || !/^BEGIN;/m.test(sql) || !/^COMMIT;$/m.test(sql)) throw new Error(`Incomplete migration: ${name}`);
    result.set(name, sql);
  }
  const names = [...result.keys()];
  if (names.join("\n") !== [...names].sort().join("\n")) throw new Error("Migration IDs must remain in sorted order.");
  return result;
}

export function readMigration(name: string): string {
  const sql = readMigrations().get(name);
  if (!sql) throw new Error(`Unknown migration: ${name}`);
  return sql;
}
