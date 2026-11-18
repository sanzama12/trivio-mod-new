import { config } from "dotenv";
import { repositories } from "../database/repositories";
import { getPool } from "../database/client";
import { DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD } from "../src/domain/demo-account";
import { isLocalDemoLoginEnabled } from "../src/lib/env";
import { hashPassword, verifyPassword } from "../src/services/password.hash";

config({ path: ".env.local", quiet: true });

async function main() {
  if (!isLocalDemoLoginEnabled()) throw new Error("Chỉ tạo tài khoản demo khi APP_URL là localhost và chế độ demo được bật.");
  const existing = await repositories.users.findByEmail(DEMO_STUDENT_EMAIL);
  if (existing) {
    if (existing.admin || existing.disabled || existing.locked || !existing.verified ||
        !(await verifyPassword(DEMO_STUDENT_PASSWORD, existing.passwordHash))) {
      throw new Error("Tài khoản demo đã tồn tại nhưng cấu hình khác; không ghi đè tài khoản.");
    }
    console.log(`Tài khoản demo đã sẵn sàng: ${DEMO_STUDENT_EMAIL}`);
    return;
  }
  await repositories.users.create({
    name: "Học sinh dùng thử",
    email: DEMO_STUDENT_EMAIL,
    avatarUrl: null,
    passwordHash: await hashPassword(DEMO_STUDENT_PASSWORD),
    googleId: null,
    verified: true,
    locked: false,
    lockUntil: null,
    disabled: false,
    failedAttempts: 0,
    sessionVersion: 0,
    emailOtpHash: null,
    emailOtpExpires: null,
    role: "user",
    gradYear: null,
    province: null,
    under16: false,
    parentConsent: false,
    onboarded: true,
    admin: false,
    lastLoginAt: null,
  });
  console.log(`Đã tạo tài khoản demo: ${DEMO_STUDENT_EMAIL}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Không tạo được tài khoản demo.");
  process.exitCode = 1;
}).finally(async () => {
  if (global.__pgPool) await getPool().end();
});
