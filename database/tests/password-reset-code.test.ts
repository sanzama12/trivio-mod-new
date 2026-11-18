import assert from "node:assert/strict";
import test from "node:test";
import { authService } from "../../src/services/auth.service";
import { POST as requestCode } from "../../src/app/api/auth/forgot-password/route";
import { POST as verifyCode } from "../../src/app/api/auth/verify-reset-code/route";
import { repositories } from "../repositories";
import type { User } from "../../src/domain/types";

test("password recovery emails a one-time code and never returns it before verification", async (t) => {
  const env = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, secret: process.env.SESSION_SECRET };
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.MAIL_FROM = "Trovio <test@example.com>";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  let user = { id: "reset-code-test", email: "owner@example.com", passwordHash: "old-hash", sessionVersion: 0, verified: false } as User;
  let saved: any = null;
  let emailedCode = "";
  try {
    t.mock.method(repositories.users, "findByEmail", async (email: string) => email === user.email ? user : null);
    t.mock.method(repositories.users, "findById", async (id: string) => id === user.id ? user : null);
    t.mock.method(repositories.users, "update", async (_id: string, patch: Partial<User>) => { user = { ...user, ...patch }; return user; });
    t.mock.method(repositories.users, "clearFailedLogin", async () => user);
    t.mock.method(repositories.passwordResetCodes, "save", async (_id: string, hash: string, expiresAt: string) => { saved = { hash, expiresAt, attempts: 0 }; return true; });
    t.mock.method(repositories.passwordResetCodes, "consume", async (_id: string, hash: string) => {
      if (!saved || Date.parse(saved.expiresAt) <= Date.now() || saved.attempts >= 5) return false;
      if (hash !== saved.hash) { saved.attempts++; return false; }
      saved = null;
      return true;
    });
    t.mock.method(repositories.passwordResetCodes, "revoke", async () => { saved = null; });
    t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      emailedCode = /\b\d{6}\b/.exec(body.text)?.[0] ?? "";
      return Response.json({ id: "email-test" });
    });

    const requested = await requestCode(new Request("http://localhost/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: user.email }) }));
    assert.equal(requested.status, 200);
    assert.deepEqual(await requested.json(), { ok: true });
    assert.match(emailedCode, /^\d{6}$/);
    assert.ok(saved);
    assert.notEqual(saved.hash, emailedCode);

    const tryCode = (code: string) => verifyCode(new Request("http://localhost/api/auth/verify-reset-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: user.email, code }) }));
    const wrong = await tryCode(emailedCode === "000000" ? "999999" : "000000");
    assert.equal(wrong.status, 400);
    assert.equal((await wrong.json()).token, undefined);
    assert.equal(saved?.attempts, 1);

    const valid = await tryCode(emailedCode);
    assert.equal(valid.status, 200);
    const token = (await valid.json()).token;
    assert.equal(typeof token, "string");
    assert.equal(saved, null);
    assert.equal((await tryCode(emailedCode)).status, 400);
    assert.equal((await authService.resetPassword(token, "Password123")).ok, true);
    assert.equal(user.verified, true);
    assert.equal(user.sessionVersion, 1);
    assert.equal((await authService.resetPassword(token, "Another123")).ok, false);
  } finally {
    for (const [name, value] of Object.entries({ RESEND_API_KEY: env.key, MAIL_FROM: env.from, SESSION_SECRET: env.secret })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("password recovery fails closed when the email provider is missing", async () => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;
  try {
    const response = await requestCode(new Request("http://localhost/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "absent@example.com" }) }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  } finally {
    if (key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = key;
    if (from === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = from;
  }
});

test("a rejected email delivery revokes the recovery code", async (t) => {
  const env = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, secret: process.env.SESSION_SECRET };
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.MAIL_FROM = "Trovio <test@example.com>";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  let savedHash = "";
  let revokedHash = "";
  try {
    t.mock.method(repositories.users, "findByEmail", async () => ({ id: "delivery-failure", email: "owner@example.com" } as User));
    t.mock.method(repositories.passwordResetCodes, "save", async (_id: string, hash: string) => { savedHash = hash; return true; });
    t.mock.method(repositories.passwordResetCodes, "revoke", async (_id: string, hash: string) => { revokedHash = hash; });
    t.mock.method(globalThis, "fetch", async () => Response.json({ message: "rejected" }, { status: 403 }));
    await assert.rejects(authService.requestPasswordResetCode("owner@example.com"));
    assert.ok(savedHash);
    assert.equal(revokedHash, savedHash);
  } finally {
    for (const [name, value] of Object.entries({ RESEND_API_KEY: env.key, MAIL_FROM: env.from, SESSION_SECRET: env.secret })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("a database resend limit does not send another email", async (t) => {
  const env = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, secret: process.env.SESSION_SECRET };
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.MAIL_FROM = "Trovio <test@example.com>";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  try {
    t.mock.method(repositories.users, "findByEmail", async () => ({ id: "limited-user", email: "owner@example.com" } as User));
    t.mock.method(repositories.passwordResetCodes, "save", async () => false);
    const send = t.mock.method(globalThis, "fetch", async () => Response.json({ id: "unexpected" }));
    await authService.requestPasswordResetCode("owner@example.com");
    assert.equal(send.mock.callCount(), 0);
  } finally {
    for (const [name, value] of Object.entries({ RESEND_API_KEY: env.key, MAIL_FROM: env.from, SESSION_SECRET: env.secret })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
