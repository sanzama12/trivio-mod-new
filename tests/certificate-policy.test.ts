/**
 * TEST SUITE: Quy đổi chứng chỉ quốc tế (IELTS) & Hỗ trợ TSA (GIAI ĐOẠN 4).
 * - Không dùng bảng quy đổi toàn cục cho mọi trường.
 * - Fail-closed: Trường chưa có chính sách xác minh trả về lỗi rõ ràng.
 * - Chính sách riêng của từng trường (NEU, FTU, HUST) được áp dụng đúng.
 * - Hỗ trợ phương thức Đánh giá tư duy (TSA).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { certificatePolicyService } from "../src/services/certificate-policy.service";
import { ADMISSION_METHODS } from "../src/services/scoring.service";

test("Fail-closed: Không có chính sách quy đổi chung khi trường thiếu policy xác minh", () => {
  const result = certificatePolicyService.convertCertificate({
    institutionId: "truong-chua-co-de-an",
    certificateType: "ielts",
    score: 7.0,
    season: 2026,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_POLICY_FOUND");
  assert.ok(result.message.includes("chưa có chính sách quy đổi"));
});

test("Trường NEU: Quy đổi IELTS theo đúng đề án tuyển sinh NEU đã xác minh", () => {
  // Điểm dưới ngưỡng tối thiểu (NEU yêu cầu tối thiểu 5.5)
  const belowMin = certificatePolicyService.convertCertificate({
    institutionId: "neu",
    certificateType: "ielts",
    score: 5.0,
    season: 2026,
  });
  assert.equal(belowMin.ok, false);
  assert.equal(belowMin.code, "SCORE_BELOW_MINIMUM");

  // IELTS 6.5 tại NEU -> 8.5
  const neu65 = certificatePolicyService.convertCertificate({
    institutionId: "neu",
    certificateType: "ielts",
    score: 6.5,
    season: 2026,
  });
  assert.equal(neu65.ok, true);
  if (neu65.ok) {
    assert.equal(neu65.result.convertedScore, 8.5);
    assert.equal(neu65.result.policy.institutionId, "neu");
    assert.ok(neu65.result.policy.officialSourceUrl.includes("neu.edu.vn"));
  }

  // IELTS 8.0 tại NEU -> 10.0
  const neu80 = certificatePolicyService.convertCertificate({
    institutionId: "neu",
    certificateType: "ielts",
    score: 8.0,
    season: 2026,
  });
  assert.equal(neu80.ok, true);
  if (neu80.ok) {
    assert.equal(neu80.result.convertedScore, 10.0);
  }
});

test("Trường FTU: Quy đổi IELTS theo đề án tuyển sinh FTU đã xác minh", () => {
  // IELTS 6.5 tại FTU -> 8.5
  const ftu65 = certificatePolicyService.convertCertificate({
    institutionId: "ftu",
    certificateType: "ielts",
    score: 6.5,
    season: 2026,
  });
  assert.equal(ftu65.ok, true);
  if (ftu65.ok) {
    assert.equal(ftu65.result.convertedScore, 8.5);
    assert.ok(ftu65.result.policy.officialSourceUrl.includes("ftu.edu.vn"));
  }
});

test("Phương thức TSA (Đánh giá tư duy ĐHBK Hà Nội) được hỗ trợ xuyên suốt", () => {
  const tsa = ADMISSION_METHODS["tsa"];
  assert.ok(tsa);
  assert.equal(tsa.max, 100);
  assert.equal(Math.round(tsa.factor * 100) / 100, 3.33);
  assert.ok(tsa.short.includes("ĐGTD"));
  assert.equal(tsa.needsCombo, false);
});
