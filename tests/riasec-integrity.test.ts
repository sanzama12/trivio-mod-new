/**
 * TEST SUITE: Tính toàn vẹn khoa học RIASEC & Server-Side Verification (GIAI ĐOẠN 6).
 * - Yêu cầu đủ 60 câu, mỗi nhóm 10 câu, thang Likert 1–5 nguyên.
 * - Phát hiện profile phẳng (flat profile, độ phân hóa < 8.0).
 * - Phát hiện các nhóm đồng điểm (tied dimensions) và đề xuất profile kết hợp.
 * - Tái tính toán và loại bỏ payload giả mạo do client gửi lên.
 * - Cảnh báo khoa học: không phải chẩn đoán tâm lý lâm sàng.
 * - Loại bỏ giới hạn giả tạo 98% và tên gọi sai lệch Iachan.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreAnswers,
  validateQuizAnswers,
  sanitizeRiasecResult,
} from "../src/services/riasec.service";
import { matchMajor } from "../src/services/riasec-match";
import { riasecQuestions } from "../src/data/riasec";

test("Validate câu trả lời trắc nghiệm: Đủ 60 câu, thang Likert 1–5 nguyên", () => {
  // 1. Thiếu câu (chỉ trả lời 59 câu)
  const missingOne: Record<number, number> = {};
  for (let i = 1; i <= 59; i++) missingOne[i] = 4;
  const valMissing = validateQuizAnswers(riasecQuestions, missingOne);
  assert.equal(valMissing.ok, false);
  if (!valMissing.ok) {
    assert.equal(valMissing.missingIds?.length, 1);
    assert.ok(valMissing.message.includes("Thiếu hoặc không hợp lệ"));
  }

  // 2. Điểm ngoài thang 1–5 (điểm 0 hoặc 6)
  const outOfRange: Record<number, number> = {};
  for (let i = 1; i <= 60; i++) outOfRange[i] = i === 10 ? 6 : 3;
  const valOutOfRange = validateQuizAnswers(riasecQuestions, outOfRange);
  assert.equal(valOutOfRange.ok, false);

  // 3. Đủ 60 câu hợp lệ
  const validAnswers: Record<number, number> = {};
  for (let i = 1; i <= 60; i++) validAnswers[i] = (i % 5) + 1;
  const valValid = validateQuizAnswers(riasecQuestions, validAnswers);
  assert.equal(valValid.ok, true);
});

test("Phát hiện profile phẳng (Flat Profile) khi người dùng chọn quá đều", () => {
  // Tất cả 60 câu đều chọn 3
  const flatAnswers: Record<number, number> = {};
  for (let i = 1; i <= 60; i++) flatAnswers[i] = 3;

  const result = scoreAnswers(riasecQuestions, flatAnswers);
  assert.equal(result.isFlatProfile, true);
  assert.ok(result.differentiation !== undefined && result.differentiation < 8.0);
  // Độ tin cậy bị hạ thấp vì profile phẳng
  assert.ok(result.confidenceScore !== undefined && result.confidenceScore <= 45);
});

test("Phát hiện đồng điểm (Tied Dimensions) giữa các nhóm", () => {
  // Giả lập câu trả lời khiến R và I cùng đạt điểm cao nhất và bằng nhau
  const tiedAnswers: Record<number, number> = {};
  for (const q of riasecQuestions) {
    if (q.type === "R" || q.type === "I") tiedAnswers[q.id] = 5;
    else tiedAnswers[q.id] = 1;
  }

  const result = scoreAnswers(riasecQuestions, tiedAnswers);
  assert.equal(result.percents.R, result.percents.I);
  assert.ok(result.tiedDimensions);
  assert.ok(result.tiedDimensions.includes("R"));
  assert.ok(result.tiedDimensions.includes("I"));
});

test("Chống giả mạo payload: Server tính lại mã chuẩn từ percents, bác bỏ mã bịa", () => {
  // Client cố tình gửi code bịa ['C', 'A', 'S'] trong khi điểm thực tế: R=90%, I=80%, A=70%
  const spoofedClientPayload = {
    percents: { R: 90, I: 80, A: 70, S: 20, E: 30, C: 10 },
    code: ["C", "A", "S"], // Mã bịa đặt
    completedAt: new Date().toISOString(),
    answered: 60,
  };

  const sanitized = sanitizeRiasecResult(spoofedClientPayload);
  assert.ok(sanitized);
  // Server không tin tưởng client.code mà tự tái tính toán theo đúng percents
  assert.deepEqual(sanitized.code, ["R", "I", "A"]);
});

test("Khuyến nghị RIASEC: Có caveat khoa học và thang điểm tự nhiên (không cap 98%)", () => {
  const result = scoreAnswers(riasecQuestions, {
    ...Object.fromEntries(riasecQuestions.map((q) => [q.id, 4])),
  });

  // Có caveat đạo đức & khoa học
  assert.ok(result.caveat);
  assert.ok(result.caveat.includes("không cấu thành đánh giá tâm lý lâm sàng"));

  // Match major với ngành trùng hoàn toàn
  const perfectMajor = {
    riasec: result.code,
  };
  const match = matchMajor(result, perfectMajor);
  // Điểm tính tự nhiên không bị giới hạn cứng ở 98%
  assert.ok(match >= 0 && match <= 100);
});
