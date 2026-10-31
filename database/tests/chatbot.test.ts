import assert from 'node:assert/strict';
import test from 'node:test';
import { maskQuestion } from '../../src/services/chatbot.service';
import { isFaithful } from '../../src/services/chatbot-llm';

test('chatbot analytics log masks contact details', () => {
  const masked = maskQuestion('Liên hệ em qua test@example.com hoặc 0912345678');
  assert.equal(masked.includes('test@example.com'), false);
  assert.equal(masked.includes('0912345678'), false);
});

test('LLM rewrite cannot introduce new numbers or links', () => {
  const facts = 'Điểm chuẩn 2025 là 24,5.';
  assert.equal(isFaithful('Điểm chuẩn năm 2025 là 24,5.', facts), true);
  assert.equal(isFaithful('Điểm chuẩn dự kiến là 26.', facts), false);
  assert.equal(isFaithful('Xem tại https://example.com', facts), false);
});
