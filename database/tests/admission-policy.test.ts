import assert from "node:assert/strict";
import { test } from "node:test";
import { admissionPolicyService, validateTranscriptRule } from "../../src/services/admission-policy.service";

test("2026 wishlist limits match the published policy boundaries", () => {
  assert.equal(admissionPolicyService.validateWishlistCount(15).valid, true);
  assert.equal(admissionPolicyService.validateWishlistCount(16).valid, false);
  assert.equal(admissionPolicyService.isTeacherTrainingRankValid(5).valid, true);
  assert.equal(admissionPolicyService.isTeacherTrainingRankValid(6).valid, false);
});

test("2026 transcript route accepts two school subjects plus a converted language certificate", () => {
  assert.equal(validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly"],
    convertedCertificateScore: 8,
  }).valid, true);
  assert.equal(validateTranscriptRule({ semesterCount: 6, subjects: ["toan", "ly"] }).valid, false);
  assert.equal(validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly"],
    convertedCertificateScore: 11,
  }).valid, false);
});

test("converted certificate weight counts toward the math or literature minimum", () => {
  assert.equal(validateTranscriptRule({
    semesterCount: 6,
    subjects: ["toan", "ly"],
    subjectWeights: { toan: 1, ly: 1 },
    convertedCertificateScore: 9,
    certificateWeight: 2,
  }).valid, false);
});
