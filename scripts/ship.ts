import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function run(cmd: string, description: string, extraEnv?: Record<string, string>) {
  console.log(`\n\x1b[36m==============================================================\x1b[0m`);
  console.log(`\x1b[33m▶ ${description}...\x1b[0m (\x1b[90m${cmd}\x1b[0m)`);
  console.log(`\x1b[36m==============================================================\x1b[0m`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    });
    console.log(`\x1b[32m✔ Hoàn thành: ${description}\x1b[0m`);
  } catch {
    console.error(`\n\x1b[31m❌ Lỗi khi thực hiện: ${description}\x1b[0m`);
    process.exit(1);
  }
}

async function main() {
  const customMessage = process.argv.slice(2).join(" ").trim();
  const commitMsg = customMessage || `chore: auto-sync admissions data & update codebase (${new Date().toLocaleString("vi-VN")})`;

  console.log(`\n\x1b[1m\x1b[35m🚀 TROVIO AUTOMATED CI/CD SHIPPER 🚀\x1b[0m`);
  console.log(`\x1b[90mCommit Message: "${commitMsg}"\x1b[0m\n`);

  // Step 1: Validate TypeScript types
  run("npm run typecheck", "Kiểm tra kiểu dữ liệu TypeScript (0 lỗi)");

  // Step 2: Validate database code; reference seed is maintained in database/seed.sql.
  run("npm run db:typecheck", "Kiểm tra mã nguồn database");

  // Step 3: Check migration status. Publishing code must not reset live data.
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    run("npm run db:status", "Kiểm tra trạng thái migration PostgreSQL");
  }

  // Step 4: Git add, commit and push
  run("git add -A", "Thêm toàn bộ tệp thay đổi vào Git staging");
  
  try {
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
  } catch {
    console.log(`\x1b[33mℹ Không có thay đổi mới cần commit trong Git.\x1b[0m`);
  }

  run("git push origin main", "Đẩy mã nguồn lên GitHub (Kích hoạt GitHub Actions CI & Vercel Auto Deploy)");

  console.log(`\n\x1b[32m🎉 ĐÃ SHIP THÀNH CÔNG!\x1b[0m`);
  console.log(`\x1b[36m- GitHub Actions:\x1b[0m Đang tự động kiểm tra pipeline`);
  console.log(`\x1b[36m- Vercel Deployment:\x1b[0m Đang tự động build và triển khai lên Production`);
  console.log(`\x1b[36m- PostgreSQL:\x1b[0m Giữ nguyên dữ liệu; áp dụng migration riêng khi cần\n`);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
