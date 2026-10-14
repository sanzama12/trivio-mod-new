/**
 * TEST SUITE: Bảo mật đăng nhập, Chống dò quét & Rate Limiter (GIAI ĐOẠN 8).
 * - Khóa tài khoản tạm thời (progressive backoff), tự động mở khóa theo thời gian.
 * - Reset bộ đếm sau khi đăng nhập thành công.
 * - Chống account enumeration & timing attacks với tài khoản không tồn tại.
 * - Chống IP spoofing với X-Forwarded-For qua cấu hình trusted proxy.
 * - Shared rate limiter hỗ trợ kiến trúc multi-instance.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-auth-")), "db.json");

import { authService } from "../src/services/auth.service";
import { clientIp } from "../src/lib/http";
import { MemoryRateLimitStore, SharedRateLimitStore, rateLimit, setRateLimitStore } from "../src/lib/rate-limit";
import { repositories } from "../src/repositories";

test("Đăng nhập: Khóa tạm thời với exponential backoff và tự mở khóa", async () => {
  const email = `lockout-${Date.now()}@example.com`;
  const password = "StrongPassword@123";

  const reg = await authService.register({
    email,
    password,
    confirm: password,
    terms: true,
  });
  assert.equal(reg.ok, true);
  if (!reg.ok) return;

  // Giả lập người dùng đã xác thực email
  await repositories.users.update(reg.user.id, { verified: true });

  // 1-4 lần nhập sai: chưa khóa, trả về attemptsLeft giảm dần
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await authService.login(email, "WrongPassword@999");
    assert.equal(res.ok, false);
    if (!res.ok && res.reason === "invalid") {
      assert.equal(res.attemptsLeft, 5 - attempt);
    } else {
      assert.fail("Lần " + attempt + " không được khóa");
    }
  }

  // Lần thứ 5 nhập sai: Bị khóa tạm thời (60 giây)
  const res5 = await authService.login(email, "WrongPassword@999");
  assert.equal(res5.ok, false);
  assert.equal(res5.reason, "locked");
  if (!res5.ok && res5.reason === "locked") {
    assert.ok(res5.lockUntil);
    const lockDurationMs = Date.parse(res5.lockUntil) - Date.now();
    assert.ok(lockDurationMs > 30_000 && lockDurationMs <= 65_000);
  }

  // Lần thứ 6 (nếu cố đăng nhập sai tiếp sau khi set lock): backoff tăng lên 300 giây (5 phút)
  // Giả lập thời gian trôi qua để hết hạn khóa lần 5
  await repositories.users.update(reg.user.id, {
    lockUntil: new Date(Date.now() - 1000).toISOString(),
  });
  const res6 = await authService.login(email, "WrongPassword@999");
  assert.equal(res6.ok, false);
  assert.equal(res6.reason, "locked");
  if (!res6.ok && res6.reason === "locked") {
    const lockDurationMs = Date.parse(res6.lockUntil!) - Date.now();
    assert.ok(lockDurationMs > 200_000 && lockDurationMs <= 310_000);
  }

  // Tự động mở khóa khi hết hạn và đăng nhập đúng -> reset bộ đếm
  await repositories.users.update(reg.user.id, {
    lockUntil: new Date(Date.now() - 1000).toISOString(),
  });
  const successLogin = await authService.login(email, password);
  assert.equal(successLogin.ok, true);

  const updatedUser = await repositories.users.findById(reg.user.id);
  assert.equal(updatedUser?.failedAttempts, 0);
  assert.equal(updatedUser?.locked, false);
  assert.equal(updatedUser?.lockUntil, null);
});

test("Chống dò quét tài khoản (Account Enumeration Resistance) & Timing Defense", async () => {
  const fakeEmail = `non-existent-${Date.now()}@example.com`;
  const t0 = performance.now();
  const res = await authService.login(fakeEmail, "AnyPassword@123");
  const duration = performance.now() - t0;

  assert.equal(res.ok, false);
  // Không làm lộ email có tồn tại hay không
  assert.equal(res.reason, "invalid");
  // Chạy scrypt dummy hash nên thời gian xử lý > 10ms (không fail ngay lập tức)
  assert.ok(duration >= 10, "Dummy scrypt hash phải tiêu tốn thời gian tính toán tương đương");
});

test("Trích xuất IP an toàn: Ngăn chặn IP spoofing qua X-Forwarded-For", () => {
  // Attacker gửi header giả: "8.8.8.8" (IP bịa), reverse proxy thêm IP thực "198.51.100.2" vào sau
  const spoofedReq = new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": "8.8.8.8, 198.51.100.2",
    },
  });

  // Khi có 1 trusted reverse proxy (trustedProxyCount: 1): lấy IP client trước proxy cuối cùng
  const safeIp = clientIp(spoofedReq, { trustProxy: true, trustedProxyCount: 1 });
  assert.equal(safeIp, "198.51.100.2");

  // Khi không tin tưởng proxy (trustProxy: false): không tin header client gửi
  const untrustedIp = clientIp(spoofedReq, { trustProxy: false });
  assert.equal(untrustedIp, "127.0.0.1");
});

test("Rate Limiter: Shared store chia sẻ trạng thái giữa nhiều instance", () => {
  const sharedMap = new Map<string, number[]>();
  const instance1 = new SharedRateLimitStore(sharedMap);
  const instance2 = new SharedRateLimitStore(sharedMap);

  const key = "test:user:123";
  const limit = 3;
  const windowSec = 60;

  // Instance 1 tiêu thụ 2 lượt
  assert.equal(instance1.hit(key, limit, windowSec), 0);
  assert.equal(instance1.hit(key, limit, windowSec), 0);

  // Instance 2 tiêu thụ lượt thứ 3 -> vẫn cho phép
  assert.equal(instance2.hit(key, limit, windowSec), 0);

  // Instance 1 hoặc 2 tiêu thụ lượt thứ 4 -> BỊ CHẶN (rate limited)
  const waitTime = instance1.hit(key, limit, windowSec);
  assert.ok(waitTime > 0);

  const waitTimeInst2 = instance2.hit(key, limit, windowSec);
  assert.ok(waitTimeInst2 > 0);
});
