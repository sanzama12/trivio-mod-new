/**
 * TEST SUITE: Quy tắc tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT) & Admission Policy Engine (GIAI ĐOẠN 1).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMISSION_POLICY_2026,
  admissionPolicyService,
  calculatePriorityPoints,
  validateTranscriptRule,
  validateTeacherTrainingRank,
  validateAdmissionScoreThreshold,
} from "../src/services/admission-policy.service";

test("Quy chế 2026: Tối đa 15 nguyện vọng", () => {
  const policy = admissionPolicyService.getPolicy(2026);
  assert.equal(policy.season, 2026);
  assert.equal(policy.status, "official");
  assert.equal(policy.maxWishlistItems, 15);
  assert.equal(policy.legalDocumentNumber, "Thông tư số 06/2026/TT-BGDĐT");
  assert.ok(policy.officialSourceUrl.includes("vanban.chinhphu.vn"));
});

test("Quy chế 2026: Ngành đào tạo giáo viên chỉ được đặt ở NV 1–5", () => {
  assert.equal(validateTeacherTrainingRank(1, 2026).valid, true);
  assert.equal(validateTeacherTrainingRank(5, 2026).valid, true);
  const invalid = validateTeacherTrainingRank(6, 2026);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.message?.includes("nguyện vọng 1 đến 5"));
});

test("Quy chế 2026: Học bạ dùng đủ 6 học kỳ, tối thiểu 3 môn, Toán hoặc Văn >= 1/3 trọng số", () => {
  // Đủ 6 kỳ, 3 môn, có Toán
  const valid = validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly", "hoa"],
    subjectWeights: { toan: 1, ly: 1, hoa: 1 },
  }, 2026);
  assert.equal(valid.valid, true);

  // Thiếu kỳ (chỉ 5 kỳ)
  const invalidSemesters = validateTranscriptRule({
    semesterCount: 5,
    subjects: ["toan", "ly", "hoa"],
  }, 2026);
  assert.equal(invalidSemesters.valid, false);
  assert.ok(invalidSemesters.message?.includes("6 học kỳ"));

  // Thiếu môn (< 3 môn)
  const invalidSubjects = validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly"],
  }, 2026);
  assert.equal(invalidSubjects.valid, false);
  assert.ok(invalidSubjects.message?.includes("ít nhất 3 môn"));

  // Không có Toán hoặc Ngữ văn
  const noMathOrLit = validateTranscriptRule({
    semesterCount: 6,
    subjects: ["ly", "hoa", "sinh"],
    subjectWeights: { ly: 1, hoa: 1, sinh: 1 },
  }, 2026);
  assert.equal(noMathOrLit.valid, false);
  assert.ok(noMathOrLit.message?.includes("Toán hoặc Ngữ văn"));

  // Có Toán nhưng trọng số < 1/3
  const lowWeight = validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly", "hoa", "sinh"],
    subjectWeights: { toan: 1, ly: 2, hoa: 2, sinh: 2 },
  }, 2026);
  assert.equal(lowWeight.valid, false);
  assert.ok(lowWeight.message?.includes("1/3 tổng trọng số"));
});

test("Quy chế 2026: Ngưỡng đầu vào tối thiểu 15/30 từ điểm thi THPT", () => {
  assert.equal(validateAdmissionScoreThreshold(15.0, 2026).valid, true);
  assert.equal(validateAdmissionScoreThreshold(22.5, 2026).valid, true);
  const invalid = validateAdmissionScoreThreshold(14.95, 2026);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.message?.includes("tối thiểu 15"));
});

test("Quy chế 2026: Điểm ưu tiên khu vực và đối tượng UT1 (+2.0), UT2 (+1.0)", () => {
  // KV1 (0.75) + UT1 (2.0) với điểm thô 20 (< 22.5) -> không giảm điểm
  const p1 = calculatePriorityPoints(20.0, "KV1", "UT1", 2026);
  assert.equal(p1.basePriority, 2.75);
  assert.equal(p1.appliedPriority, 2.75);
  assert.equal(p1.isReduced, false);

  // KV2 (0.25) + UT2 (1.0) với điểm thô 22.0 -> không giảm điểm
  const p2 = calculatePriorityPoints(22.0, "KV2", "UT2", 2026);
  assert.equal(p2.basePriority, 1.25);
  assert.equal(p2.appliedPriority, 1.25);
  assert.equal(p2.isReduced, false);
});

test("Quy chế 2026: Công thức giảm điểm ưu tiên từ mốc 22.5: [(30 - tổng) / 7.5] * mức ưu tiên", () => {
  // Tổng điểm 26.25 (chênh 3.75 từ 30, tức bằng đúng một nửa của 7.5) -> ưu tiên giảm đúng 50%
  const res = calculatePriorityPoints(26.25, "KV1", "none", 2026);
  assert.equal(res.basePriority, 0.75);
  assert.equal(res.isReduced, true);
  // (30 - 26.25) / 7.5 = 3.75 / 7.5 = 0.5 -> 0.75 * 0.5 = 0.375 -> làm tròn 0.38
  assert.equal(res.appliedPriority, 0.38);

  // Điểm tối đa 30 -> điểm ưu tiên giảm về 0
  const maxScore = calculatePriorityPoints(30.0, "KV1", "UT1", 2026);
  assert.equal(maxScore.appliedPriority, 0);
  assert.equal(maxScore.isReduced, true);
});

test("Quy chế 2027 là bản DRAFT, không được áp dụng như OFFICIAL", () => {
  const policy2027 = admissionPolicyService.getPolicy(2027);
  assert.equal(policy2027.status, "draft");
  assert.ok(policy2027.notes.includes("dự thảo"));
  assert.throws(() => {
    // Không thể lấy policy 2027 với yêu cầu official
    admissionPolicyService.getOfficialPolicy(2027);
  });
});
