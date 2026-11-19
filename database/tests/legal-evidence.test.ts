import assert from "node:assert/strict";
import test from "node:test";
import { admissionPolicyService } from "../../src/services/admission-policy.service";
import { ScoringController } from "../../src/controllers/scoring.controller";
import { certificatePolicyService } from "../../src/services/certificate-policy.service";
import { requiresPrimaryEvidence, isPrimaryDocumentUrl } from "../../src/services/chatbot-evidence";
import { answerQuestion, chatbotService } from "../../src/services/chatbot.service";
import { getTriovoKnowledge } from "../../src/services/ai-knowledge-base";
import { repositories } from "../repositories";

test("2026 priority boundaries, graduation eligibility and reduction follow Article 7", () => {
  const compute = (raw: number, year?: number) => admissionPolicyService.computePriorityPoints("KV1", "UT1", raw, 30, 2026, year);
  assert.equal(compute(22, 2026).appliedPriority, 2.75);
  assert.equal(compute(22.5, 2025).appliedPriority, 2.75);
  assert.equal(compute(27, 2026).appliedPriority, 1.10);
  assert.equal(compute(30, 2026).appliedPriority, 0);
  assert.equal(compute(22, 2024).rawPriority, 2);
  assert.equal(compute(22).rawPriority, 2);
  assert.throws(() => compute(31, 2026), RangeError);
  assert.throws(() => admissionPolicyService.getPolicy(2027), RangeError);
  assert.equal(admissionPolicyService.getOfficialPolicy(2026).effectiveTo, undefined);
});

test("score API returns the legal document, clause and calculation scope", async () => {
  const request = (body: unknown) => new Request("http://localhost/api/scoring/calculate", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  const response = await ScoringController.calculateScore(request({ rawTotal: 27, region: "KV1", group: "UT1", graduationYear: 2026 }));
  const body = await response.json();
  assert.equal(body.admission.priorityApplied, 1.1);
  assert.equal(body.admission.total, 28.1);
  assert.match(body.policy.officialSourceUrl, /datafiles.chinhphu.vn/);
  assert.match(body.policy.provisions.priority, /Điều 7/);
  assert.equal((await ScoringController.calculateScore(request({ rawTotal: 27, bonusPoints: 3 }))).status, 422);
});

test("unverified certificate tables and partial institution ids cannot convert scores", () => {
  for (const institutionId of ["neu", "hust", "ftu", "n", ""]) {
    assert.equal(certificatePolicyService.convertScore({ institutionId, certificateType: "IELTS", score: 7, season: 2026 }).ok, false);
  }
});

test("business claims need a primary document, never a homepage or generic model answer", () => {
  assert.equal(requiresPrimaryEvidence("So sánh học phí và điểm cộng IELTS năm 2026"), true);
  assert.equal(requiresPrimaryEvidence("Vì sao bầu trời màu xanh?"), false);
  assert.equal(isPrimaryDocumentUrl("https://tuyensinh.neu.edu.vn"), false);
  assert.equal(isPrimaryDocumentUrl("https://example.com/article"), false);
  assert.equal(isPrimaryDocumentUrl("https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/06-bgddt.pdf"), true);
});

test("priority and bonus answers cite the original regulation without loading the catalog", async () => {
  const priority = await answerQuestion("Điểm ưu tiên khu vực 2026 tính thế nào?");
  const bonus = await answerQuestion("Điểm cộng chứng chỉ IELTS năm 2026?");
  assert.match(priority.text, /Điều 7/);
  assert.match(bonus.text, /không dùng đồng thời/);
  assert.ok(priority.sources.some((source) => source.href.includes("06-bgddt.pdf")));
  assert.ok(bonus.sources.some((source) => source.href.includes("06-bgddt.pdf")));
  assert.doesNotMatch(getTriovoKnowledge(), /60%.*85%|bảo hiểm đỗ đại học 100%/);
});

test("unresolved admissions figures never call a general model or accept a homepage as proof", async (t) => {
  t.mock.method(repositories.majors, "findAll", async () => []);
  t.mock.method(repositories.schools, "findAll", async () => []);
  t.mock.method(repositories.programs, "findAll", async () => []);
  t.mock.method(repositories.chatAliases, "list", async () => []);
  t.mock.method(repositories.aiSources, "list", async () => []);
  t.mock.method(repositories.chatLogs, "add", async () => {});
  const upstream = t.mock.method(globalThis, "fetch", async () => { throw new Error("Must not ask a model to invent an admissions figure"); });
  const result = await chatbotService.ask("Học phí trường chưa có dữ liệu năm 2026 là bao nhiêu?");
  assert.equal(result.ok, true);
  if (result.ok) assert.notEqual(result.answer.kind, "answer");
  assert.equal(upstream.mock.callCount(), 0);
});
