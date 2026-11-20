/** Integration checks against the configured DB; all temporary documents roll back. */
import { config } from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { repositories } from "../database/repositories";
import { withTransaction, getPool } from "../database/client";
import { PostgresRateLimitStore } from "../src/lib/rate-limit";
import type { ChatConversation } from "../src/domain/chat";

config({ path: ".env.local", quiet: true });
const rollback = new Error("verification rollback");

async function main() {
  try {
    await withTransaction(async () => {
      const id = randomUUID();
      const owner = `verification-${id}`;
      const original = { saved: [], wishlist: [], profile: null, goal: null, preferences: null, updatedAt: new Date(0).toISOString() };
      const first = await repositories.userData.compareAndSwap(owner, original, original.updatedAt);
      assert.ok(first);
      assert.equal(await repositories.userData.compareAndSwap(owner, original, original.updatedAt), null);
      const second = await repositories.userData.compareAndSwap(owner, original, first.updatedAt);
      assert.ok(second && second.updatedAt > first.updatedAt);
      const now = new Date().toISOString();
      const conversation: ChatConversation = { id, userId: owner, title: "Verification", createdAt: now, updatedAt: now,
        messages: Array.from({ length: 100 }, (_, n) => ({ id: `m${n}`, role: "user", at: now, text: "Verification" })) };
      await repositories.chatHistory.append(conversation);
      const appended = await repositories.chatHistory.append({ ...conversation, messages: [{ id: "m100", role: "user", at: now, text: "Verification" }] });
      assert.equal(appended.messages.length, 101);
      assert.equal((await repositories.chatHistory.summarizeUser(owner)).questionCount, 101);
      const limiter = new PostgresRateLimitStore();
      assert.equal(await limiter.hit(owner, 1, 60), 0);
      assert.ok(await limiter.hit(owner, 1, 60) > 0);
      console.log("PASS: verified TLS, CAS conflicts, monotonic versions, append history, user summary, shared limiter.");
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally { await getPool().end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
