import assert from "node:assert/strict";
import test from "node:test";
import { authService } from "../../src/services/auth.service";
import { hashPassword } from "../../src/services/password.hash";
import { userAdminService } from "../../src/services/user-admin.service";
import { repositories } from "../repositories";
import type { PublicUser, User } from "../../src/domain/types";

test("three wrong passwords lock for 30 minutes; five require an admin unlock", async (t) => {
  let now = Date.parse("2026-11-18T08:00:00.000Z");
  t.mock.method(Date, "now", () => now);
  let user = {
    id: "lockout-user", email: "lockout@example.com", name: "Lockout user",
    passwordHash: await hashPassword("Correct123"), failedAttempts: 0,
    locked: false, lockUntil: null, disabled: false, verified: true,
    sessionVersion: 0,
  } as User;
  t.mock.method(repositories.users, "findByEmail", async () => user);
  t.mock.method(repositories.users, "findById", async () => user);
  t.mock.method(repositories.users, "findByGoogleId", async () => user);
  t.mock.method(repositories.users, "update", async (_id: string, patch: Partial<User>) => {
    user = { ...user, ...patch };
    return user;
  });
  t.mock.method(repositories.users, "recordFailedLogin", async () => {
    if (user.disabled || user.failedAttempts >= 5 || user.locked && (!user.lockUntil || Date.parse(user.lockUntil) > now)) return null;
    const count = user.failedAttempts + 1;
    user = { ...user, failedAttempts: count, locked: count >= 3,
      lockUntil: count >= 5 ? null : count >= 3 ? new Date(now + 30 * 60_000).toISOString() : null,
      sessionVersion: (user.sessionVersion ?? 0) + (count >= 3 ? 1 : 0) };
    return { failedAttempts: count, locked: user.locked, lockUntil: user.lockUntil };
  });
  t.mock.method(repositories.users, "clearFailedLogin", async () => {
    if (user.disabled || user.failedAttempts >= 5 || user.locked && (!user.lockUntil || Date.parse(user.lockUntil) > now)) return null;
    user = { ...user, locked: false, lockUntil: null };
    return user;
  });
  t.mock.method(repositories.passwordResetCodes, "revoke", async () => {});
  t.mock.method(repositories.audit, "append", async () => {});

  assert.deepEqual(await authService.login(user.email, "Wrong123"), { ok: false, reason: "invalid", attemptsLeft: 2 });
  assert.deepEqual(await authService.login(user.email, "Wrong123"), { ok: false, reason: "invalid", attemptsLeft: 1 });
  const third = await authService.login(user.email, "Wrong123");
  assert.equal(third.ok, false);
  assert.equal(third.reason, "locked");
  if (third.reason !== "locked") return;
  assert.equal(third.permanent, false);
  assert.equal(Date.parse(third.lockUntil!), now + 30 * 60_000);
  assert.equal((await authService.login(user.email, "Correct123")).ok, false);
  assert.equal((await authService.getUserForSession(user.id, user.sessionVersion ?? 0)), null);
  assert.equal((await authService.loginWithGoogle({ sub: "google-user", email: user.email, emailVerified: true, name: user.name, picture: null })).ok, false);

  const resetToken = (await authService.requestPasswordReset(user.email)).token;
  assert.equal((await authService.resetPassword(resetToken, "NewPassword123")).ok, true);
  assert.equal(user.locked, true);
  assert.equal(user.failedAttempts, 3);

  now += 30 * 60_000 + 1;
  const fourth = await authService.login(user.email, "Wrong123");
  assert.equal(fourth.ok, false);
  if (fourth.ok) return;
  assert.equal(fourth.reason, "locked");
  if (fourth.reason !== "locked") return;
  assert.equal(fourth.permanent, false);
  assert.equal(fourth.attemptsLeft, 1);

  now += 30 * 60_000 + 1;
  assert.equal((await authService.login(user.email, "NewPassword123")).ok, true);
  assert.equal(user.failedAttempts, 4);
  const fifth = await authService.login(user.email, "Wrong123");
  assert.equal(fifth.ok, false);
  if (fifth.ok) return;
  assert.equal(fifth.reason, "locked");
  if (fifth.reason !== "locked") return;
  assert.equal(fifth.permanent, true);
  assert.equal(fifth.lockUntil, null);
  assert.equal((await authService.login(user.email, "NewPassword123")).ok, false);
  assert.deepEqual(await authService.loginWithGoogle({ sub: "google-user", email: user.email, emailVerified: true, name: user.name, picture: null }), { ok: false, reason: "disabled" });
  assert.deepEqual(await authService.resetPassword((await authService.requestPasswordReset(user.email)).token, "AnotherPassword123"), { ok: false, reason: "locked" });

  const admin = { id: "admin-other", email: "admin@example.com", admin: true } as PublicUser;
  assert.deepEqual(await userAdminService.action(admin, user.id, { action: "unlock" }, () => ""), { ok: true });
  assert.equal(user.failedAttempts, 0);
  assert.equal(user.lockUntil, null);
  assert.equal(user.locked, false);
  assert.equal((await authService.login(user.email, "NewPassword123")).ok, true);
});
