/** Prevent connection-string sslmode from overriding certificate validation. */
export function databaseConnection(connectionString: string, production = process.env.NODE_ENV === "production") {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const tls = !local || (sslMode !== null && sslMode !== "disable");
  if (production && !local && sslMode === "disable") throw new Error("Remote production databases require verified TLS.");
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: tls ? { rejectUnauthorized: true, ...(process.env.PG_SSL_CA ? { ca: process.env.PG_SSL_CA.replace(/\\n/g, "\n") } : {}) } : undefined,
  };
}
