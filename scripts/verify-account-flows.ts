/** Local-only E2E checks using disposable accounts, always removed in finally. */
import { config } from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { repositories } from "../database/repositories";
import { getPool } from "../database/client";
import { createSessionToken, SESSION_COOKIE } from "../src/services/session.service";

config({ path: ".env.local", quiet: true });
const baseURL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Run disposable-account checks against a local server only.");

async function main() {
  const accounts: string[] = [];
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const suffix = randomUUID();
    const input = {
      name: `Verification-${suffix}`, email: `verification-${suffix}@example.invalid`, passwordHash: null,
      googleId: null, avatarUrl: null, verified: true, locked: false, disabled: false, failedAttempts: 0,
      role: "user" as const, gradYear: null, province: null, under16: false, parentConsent: false, onboarded: true,
    };
    const user = await repositories.users.create(input);
    accounts.push(user.id);
    const admin = await repositories.users.create({ ...input, name: "Verification admin", email: `verification-admin-${suffix}@example.invalid`, admin: true });
    accounts.push(admin.id);
    const now = new Date().toISOString();
    await repositories.chatHistory.append({
      id: randomUUID(), userId: user.id, title: "Verification conversation", createdAt: now, updatedAt: now,
      messages: [{ id: randomUUID(), role: "user", at: now, text: "Verification question" }],
    });
    const context = await browser.newContext({ baseURL });
    await context.addCookies([{ name: SESSION_COOKIE, value: createSessionToken(user.id), url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    assert.equal((await context.request.get("/quan-tri/chatbot")).status(), 404);
    const current = await (await context.request.get("/api/account/data")).json();
    const headers = { "If-Unmodified-Since": current.data.updatedAt, Origin: process.env.APP_URL ?? baseURL };
    const writes = await Promise.all([
      context.request.put("/api/account/data", { headers, data: { saved: [], wishlist: [], profile: null } }),
      context.request.put("/api/account/data", { headers, data: { saved: [], wishlist: [], profile: null } }),
    ]);
    assert.deepEqual(writes.map((response) => response.status()).sort(), [200,409]);
    const adminContext = await browser.newContext({ baseURL });
    await adminContext.addCookies([{ name: SESSION_COOKIE, value: createSessionToken(admin.id), url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    const page = await adminContext.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/quan-tri/nguoi-dung?q=${encodeURIComponent(input.email)}`, { waitUntil: "networkidle" });
    await page.getByRole("cell", { name: input.email, exact: true }).waitFor();
    await page.goto("/quan-tri/chatbot", { waitUntil: "networkidle" });
    assert.equal(await page.getByRole("heading", { name: /Nhật ký/ }).count(), 0);
    await page.locator(`a[href='/quan-tri/chatbot/nguoi-dung/${user.id}']`).first().click();
    await page.getByRole("heading", { name: "Lịch sử hội thoại", exact: true }).waitFor();
    await page.getByText("Verification question", { exact: true }).waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log("PASS: ordinary-user access denied, concurrent account writes 200/409, filtered admin users, chatbot user details, no browser exceptions.");
  } finally {
    await browser.close();
    const cleanup = await Promise.allSettled(accounts.reverse().map((id) => repositories.users.delete(id)));
    await getPool().end();
    if (cleanup.some((result) => result.status === "rejected")) throw new Error("Temporary account cleanup failed; inspect verification accounts before rerunning.");
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
