/** One-time import. Never overwrites staged entries or publishes catalog data. */
import { readFile, access } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { saveStagingEntry, stagingPool, closeStaging } from "../staging";

const manifest = [
  ["database/data/school-websites.json", "school-websites", "map"],
  ["database/data/school-logos.json", "school-logos", "map"],
  ["database/data/school-logo-overrides.json", "school-logo-overrides", "map"],
  ["scratch/school-logo-results.json", "school-logo-results", "code"],
  ["scratch/school-profile-candidates.json", "school-profile-candidates", "code"],
  ["scratch/school-enrichment-audit.json", "legacy-enrichment-audit", "single"],
  ["database/ts247_parsed_data.json", "ts247-parsed", "school_code"],
] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  const entries: { dataset: string; key: string; value: unknown }[] = [];
  for (const [file, dataset, shape] of manifest) {
    try { await access(file); } catch { continue; }
    const value: unknown = JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
    if (shape === "single") entries.push({ dataset, key: "imported", value });
    else if (shape === "map") {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid map: ${file}`);
      for (const [key, item] of Object.entries(value)) entries.push({ dataset, key, value: item });
    } else {
      if (!Array.isArray(value)) throw new Error(`Invalid array: ${file}`);
      for (const item of value) {
        if (!item || typeof item !== "object" || typeof item[shape] !== "string") throw new Error(`Missing record key: ${file}`);
        entries.push({ dataset, key: item[shape], value: item });
      }
    }
  }
  console.log(`${apply ? "Import" : "Dry run"}: ${entries.length} legacy entries. Source files are preserved.`);
  if (!apply) return;
  const client = await stagingPool().connect();
  try {
    await client.query("BEGIN");
    const batch = entries.map((entry) => {
      if (!entry.key || entry.key.length > 200) throw new Error("Invalid legacy entry key.");
      return { id: `${entry.dataset}:${entry.key}`, dataset: entry.dataset, payload: { value: entry.value } };
    });
    if (new Set(batch.map((entry) => entry.id)).size !== batch.length) throw new Error("Duplicate legacy entry keys.");
    const result = await client.query(`INSERT INTO trovio.app_documents(collection,id,parent_id,payload)
      SELECT 'etl-staging',source.id,source.dataset,source.payload
      FROM jsonb_to_recordset($1::jsonb) AS source(id text,dataset text,payload jsonb)
      ON CONFLICT(collection,id) DO NOTHING RETURNING id`, [JSON.stringify(batch)]);
    const inserted = result.rowCount ?? 0;
    const stored = await client.query<{ id: string; payload: { value: unknown } }>(
      "SELECT id,payload FROM trovio.app_documents WHERE collection='etl-staging' AND id=ANY($1::text[])", [batch.map((entry) => entry.id)]);
    const byId = new Map(stored.rows.map((entry) => [entry.id, entry.payload.value]));
    let different = 0;
    for (const entry of entries) {
      const id = `${entry.dataset}:${entry.key}`;
      if (!byId.has(id)) throw new Error("Missing imported staging record.");
      if (!isDeepStrictEqual(byId.get(id), entry.value)) {
        // Preserve the incoming legacy value separately, never replace the newer primary entry.
        const digest = createHash("sha256").update(JSON.stringify(entry.value)).digest("hex");
        await saveStagingEntry(`${entry.dataset}-legacy`, `${entry.key}-${digest}`, entry.value, { onlyMissing: true, client });
        different++;
      }
    }
    await client.query("COMMIT");
    console.log(`Verified ${entries.length} entries; inserted=${inserted}, existing differences archived=${different}. No catalog rows changed.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(closeStaging);
