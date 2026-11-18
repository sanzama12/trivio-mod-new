import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_IMAGE_WINDOW_MS, nextChatQuotaReset } from "../../src/domain/chat-quota";

test("text quota resets at midnight in Vietnam", () => {
  assert.equal(nextChatQuotaReset("text", Date.parse("2026-11-18T16:59:59.000Z")), "2026-11-18T17:00:00.000Z");
  assert.equal(nextChatQuotaReset("text", Date.parse("2026-11-18T17:00:00.000Z")), "2026-11-19T17:00:00.000Z");
});

test("image quota resets seven full days after its first use", () => {
  const firstUse = Date.parse("2026-11-18T03:00:00.000Z");
  assert.equal(Date.parse(nextChatQuotaReset("image", firstUse)) - firstUse, CHAT_IMAGE_WINDOW_MS);
});
