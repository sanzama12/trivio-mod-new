/** Fill missing database logo URLs; existing admin values are preserved.
 * npm run school-logos:check                  (offline coverage)
 * npm run school-logos:publish                (database dry run)
 * npm run school-logos:publish -- --apply     (save URLs)
 */
import { config } from "dotenv";
import { stagingEntries, closeStaging } from "../staging";

config({ path: ".env.local", quiet: true });

async function main() {
  const logos: Record<string, string> = await stagingEntries<string>("school-logos");
  const websites: Record<string, string> = await stagingEntries<string>("school-websites");
  if (!Object.keys(websites).length) throw new Error("No school websites in PostgreSQL staging.");
  const entries = Object.entries(logos).map(([code, url]) => {
    const parsed = new URL(url);
    if (!websites[code] || parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error(`Invalid school logo URL: ${code}`);
    }
    return { code, url };
  });
  const missing = Object.keys(websites).filter(code => !logos[code]);
  console.log(`Logo URL sources: ${entries.length}/${Object.keys(websites).length}`);
  if (missing.length) console.log(`Missing sources: ${missing.join(", ")}`);
  if (process.argv.includes("--check")) {
    if (missing.length) process.exitCode = 1;
    return;
  }

  const { afterCommit, getPool, query, withTransaction } = await import("../client");
  const { invalidatePostgresCache } = await import("../repositories/postgres");
  const apply = process.argv.includes("--apply");
  try {
    const schools = await query<{ code: string; logo_url: string | null }>(
      "SELECT code, logo_url FROM trovio.schools ORDER BY code",
    );
    const pending = schools.filter(school => !school.logo_url && logos[school.code]);
    const remaining = schools.filter(school => !school.logo_url && !logos[school.code]);
    console.log(`${apply ? "Apply" : "Dry run"}: fill ${pending.length} missing URLs; ${remaining.length} schools still need sources.`);
    if (!apply) return;
    await withTransaction(async () => {
      await query(
        `UPDATE trovio.schools AS school
         SET logo_url = source.url, updated_at = now()
         FROM jsonb_to_recordset($1::jsonb) AS source(code text, url text)
         WHERE school.code = source.code
           AND NULLIF(school.logo_url, '') IS NULL`,
        [JSON.stringify(entries)],
      );
      afterCommit(invalidatePostgresCache);
    });
    // Other running processes refresh their catalog cache within two minutes.
    console.log("Saved external HTTPS URLs. No image files created.");
  } finally {
    await getPool().end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(closeStaging);
