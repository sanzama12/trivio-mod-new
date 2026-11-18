const base = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const paths = ["/api/v1/health", "/", "/truong", "/nganh", "/chuong-trinh", "/dang-nhap", "/dang-ky", "/trac-nghiem", "/diem-cua-toi", "/ung-ho", "/so-sanh", "/quan-tri"];
let failed = 0;
// Keep the check sequential so it measures routes without overwhelming a cold database.
for (const path of paths) {
  const started = Date.now();
  try {
    const response = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    const redirect = [301, 302, 303, 307, 308].includes(response.status);
    const healthy = path === "/api/v1/health"
      ? response.ok && JSON.parse(body).data?.status === "ready"
      : (response.ok && !/\\?"digest\\?":\\?"[^"\\]+/.test(body)) || (redirect && Boolean(response.headers.get("location")));
    if (!healthy) failed++;
    console.log(`${healthy ? "PASS" : "FAIL"} ${path} HTTP ${response.status} ${Date.now() - started}ms`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${path} ${error.name}`);
  }
}
console.log(`${paths.length - failed}/${paths.length} routes passed`);
process.exitCode = failed ? 1 : 0;
