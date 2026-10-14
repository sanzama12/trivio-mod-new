/**
 * Kiểm thử đợt 10/2026: mini-test Phong cách làm việc (4 trục), góc nhìn MBTI tham khảo,
 * đồng bộ dữ liệu, và câu hỏi RIASEC viết lại theo tình huống. Điểm phù hợp KHÔNG được thay đổi.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  compareMbti,
  describeAxis,
  GROUP_STYLE,
  isMbtiCode,
  majorStyleProfile,
  matchWorkStyle,
  MBTI_CODES,
  sanitizeMbti,
  sanitizeWorkStyle,
  scoreWorkStyle,
  styleLine,
  styleReasons,
  styleSentence,
  summarizeWorkStyle,
  WORK_AXES,
  WORK_STYLE_QUESTIONS,
  type WorkStyleChoice,
} from "../src/domain/work-style";
import { majors } from "../src/data/majors";
import { riasecQuestions } from "../src/data/riasec";
import { mergeUserData, sanitizeUserData, userDataService } from "../src/services/user-data.service";
import { recommendationService } from "../src/services/recommendation.service";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-style-")), "db.json");

const answerAll = (pick: (axis: string, i: number) => WorkStyleChoice) => {
  const seen: Record<string, number> = {};
  return Object.fromEntries(
    WORK_STYLE_QUESTIONS.map((q) => {
      seen[q.axis] = (seen[q.axis] ?? 0) + 1;
      return [q.id, pick(q.axis, seen[q.axis])];
    }),
  );
};
// Hồ sơ mẫu: rõ làm nhóm (+3), hơi ổn định (+1), hơi máy tính (−1), rõ chi tiết (+3).
const SAMPLE = { social: 3, stability: 1, hands: -1, detail: 3 };
const sampleAnswers = answerAll((axis, i) => {
  if (axis === "social" || axis === "detail") return "a";
  if (axis === "stability") return i <= 2 ? "a" : "b";
  return i === 1 ? "a" : "b";
});

test("mini-test: 12 câu, mỗi trục 3 câu, id duy nhất, xen kẽ trục, đảo A/B mỗi trục một câu", () => {
  assert.equal(WORK_STYLE_QUESTIONS.length, 12);
  assert.equal(new Set(WORK_STYLE_QUESTIONS.map((q) => q.id)).size, 12);
  for (const a of WORK_AXES) {
    assert.equal(WORK_STYLE_QUESTIONS.filter((q) => q.axis === a).length, 3, a);
    assert.equal(WORK_STYLE_QUESTIONS.filter((q) => q.axis === a && q.flip).length, 1, `flip ${a}`);
  }
  for (let i = 1; i < WORK_STYLE_QUESTIONS.length; i++) assert.notEqual(WORK_STYLE_QUESTIONS[i].axis, WORK_STYLE_QUESTIONS[i - 1].axis);
  for (const q of WORK_STYLE_QUESTIONS) for (const t of [q.prompt, q.a, q.b]) assert.ok(t.split(/\s+/).length <= 16, t);
});

test("chấm điểm trục ∈ {−3,−1,+1,+3}; thiếu câu → null", () => {
  assert.deepEqual(scoreWorkStyle(answerAll(() => "a")), { social: 3, stability: 3, hands: 3, detail: 3 });
  assert.deepEqual(scoreWorkStyle(answerAll(() => "b")), { social: -3, stability: -3, hands: -3, detail: -3 });
  assert.deepEqual(scoreWorkStyle(sampleAnswers), SAMPLE);
  const partial = { ...sampleAnswers };
  delete partial[WORK_STYLE_QUESTIONS[5].id];
  assert.equal(scoreWorkStyle(partial), null);
  assert.equal(scoreWorkStyle({ ...sampleAnswers, [WORK_STYLE_QUESTIONS[0].id]: "c" as WorkStyleChoice }), null);
});

test("mô tả trục & câu tóm tắt", () => {
  assert.equal(describeAxis("social", 3), "Nghiêng rõ về làm cùng mọi người · 3/3 tình huống");
  assert.equal(describeAxis("hands", -1), "Hơi nghiêng về máy tính, tài liệu · 2/3 tình huống");
  const s = summarizeWorkStyle(SAMPLE);
  assert.match(s, /^Bạn thích làm cùng mọi người, rất để ý chi tiết, hơi ưa sự ổn định và hơi thích làm việc trên máy tính\.$/);
  assert.match(summarizeWorkStyle({ social: 1, stability: -1, hands: 1, detail: -1 }), /linh hoạt/);
});

test("hồ sơ ngành: mọi ngành đều có 1–3 trục; ngành mới dùng mặc định nhóm", () => {
  for (const m of majors) {
    const n = Object.keys(majorStyleProfile(m)).length;
    assert.ok(n >= 1 && n <= 3, `${m.slug}: ${n}`);
  }
  assert.deepEqual(majorStyleProfile({ slug: "nganh-moi-tao", groupId: "y-duoc" }), GROUP_STYLE["y-duoc"]);
  assert.deepEqual(majorStyleProfile({ slug: "x", groupId: "khong-co" }), {});
  assert.equal(matchWorkStyle(SAMPLE, { slug: "x", groupId: "khong-co" }), null);
});

test("câu giải thích: Kế toán khớp ổn định, chi tiết (đúng ví dụ trong kế hoạch)", () => {
  const ke = majors.find((m) => m.slug === "ke-toan")!;
  const m = matchWorkStyle(SAMPLE, ke)!;
  assert.equal(m.total, 3);
  assert.equal(m.matched.length, 3);
  const s = styleSentence(ke.name, "CEI", m);
  assert.ok(s.startsWith("Ngành Kế toán hợp mã CEI của bạn, và phong cách thích "), s);
  assert.ok(s.includes("ổn định") && s.includes("chi tiết") && s.endsWith("của bạn cũng khớp."), s);
  assert.ok(styleLine(m).startsWith("Khớp 3/3"));

  const mk = majors.find((x) => x.slug === "marketing")!;
  const m2 = matchWorkStyle(SAMPLE, mk)!;
  assert.deepEqual([m2.matched.length, m2.total], [1, 3]);
  assert.match(styleLine(m2), /^Khớp 1\/3 — hợp ở làm nhóm; ngành thiên về thay đổi, sáng tạo ý tưởng hơn bạn\.$/);
  const reasons = styleReasons(SAMPLE, m2);
  assert.equal(reasons.length, 3);
  assert.equal(reasons.filter((r) => r.ok).length, 1);
});

test("MBTI: 16 mã hợp lệ, so sánh từng chữ với mini-test", () => {
  assert.equal(MBTI_CODES.length, 16);
  assert.equal(new Set(MBTI_CODES).size, 16);
  for (const bad of ["ABCD", "infj", "INF", "INFJX", "<script>", 1, null]) assert.equal(isMbtiCode(bad), false, String(bad));
  const r = compareMbti("ISFJ", SAMPLE);
  assert.deepEqual(r.map((x) => [x.letter, x.status]), [["I", "diff"], ["S", "match"], ["F", "none"], ["J", "match"]]);
  assert.ok(compareMbti("ENTP", null).every((x) => x.status === "unknown" || x.status === "none"));
});

test("làm sạch dữ liệu: workStyle & mbti không tin client", () => {
  const ok = { scores: SAMPLE, completedAt: "2026-10-04T08:00:00.000Z" };
  assert.deepEqual(sanitizeWorkStyle(ok), ok);
  assert.equal(sanitizeWorkStyle({ ...ok, scores: { ...SAMPLE, hands: 2 } }), null);
  assert.equal(sanitizeWorkStyle({ ...ok, scores: { ...SAMPLE, hands: "3" } }), null);
  assert.equal(sanitizeWorkStyle({ scores: { social: 3 }, completedAt: ok.completedAt }), null);
  assert.equal(sanitizeWorkStyle({ ...ok, completedAt: "không phải ngày" }), null);
  assert.equal(sanitizeWorkStyle([ok]), null);
  assert.deepEqual(sanitizeMbti({ code: "INFJ", updatedAt: "2026-10-04T08:00:00.000Z" }), { code: "INFJ", updatedAt: "2026-10-04T08:00:00.000Z" });
  assert.equal(sanitizeMbti({ code: "<b>", updatedAt: "2026-10-04" }), null);

  const clean = sanitizeUserData({ workStyle: { ...ok, extra: "x" }, mbti: { code: "ENFP", updatedAt: "2026-10-01", hack: 1 } });
  assert.deepEqual(Object.keys(clean.workStyle!).sort(), ["completedAt", "scores"]);
  assert.deepEqual(Object.keys(clean.mbti!).sort(), ["code", "updatedAt"]);
  assert.equal(sanitizeUserData({ saved: [] }).workStyle, null); // dữ liệu cũ chưa có trường mới
});

test("gộp dữ liệu khi đăng nhập: lấy bản mới hơn của mini-test và MBTI", () => {
  const older = { scores: SAMPLE, completedAt: "2026-09-01T00:00:00.000Z" };
  const newer = { scores: { ...SAMPLE, social: -3 }, completedAt: "2026-10-01T00:00:00.000Z" };
  const m = mergeUserData(
    sanitizeUserData({ workStyle: older, mbti: { code: "INFJ", updatedAt: "2026-10-02T00:00:00.000Z" } }),
    sanitizeUserData({ workStyle: newer, mbti: { code: "ESTP", updatedAt: "2026-09-02T00:00:00.000Z" } }),
  );
  assert.equal(m.workStyle?.scores.social, -3);
  assert.equal(m.mbti?.code, "INFJ");
  assert.equal(mergeUserData(sanitizeUserData({}), sanitizeUserData({ mbti: { code: "ESTP", updatedAt: "2026-09-02" } })).mbti?.code, "ESTP");
});

test("đồng bộ tài khoản lưu & trả về mini-test, MBTI", async () => {
  const ws = { scores: SAMPLE, completedAt: "2026-10-04T08:00:00.000Z" };
  await userDataService.replace("u-001", { saved: [], wishlist: [], workStyle: ws, mbti: { code: "ISFJ", updatedAt: "2026-10-04T08:00:00.000Z" } });
  const got = await userDataService.get("u-001");
  assert.deepEqual(got.workStyle, ws);
  assert.equal(got.mbti?.code, "ISFJ");
  await userDataService.replace("u-001", { saved: [], workStyle: null, mbti: null });
  const cleared = await userDataService.get("u-001");
  assert.equal(cleared.workStyle, null);
  assert.equal(cleared.mbti, null);
});

test("điểm phù hợp KHÔNG đổi khi có mini-test/MBTI; công thức không import module phong cách", async () => {
  const input = { riasec: { percents: { R: 40, I: 70, A: 30, S: 55, E: 60, C: 80 }, code: ["C", "I", "E"] as ["C", "I", "E"] }, score: { method: "thpt" as const, total: 25.5, combo: "A00" } };
  const a = await recommendationService.recommend(input, 12);
  const b = await recommendationService.recommend({ ...input, workStyle: { scores: SAMPLE }, mbti: { code: "ISFJ" } } as typeof input, 12);
  assert.deepEqual(
    b.items.map((x) => [x.view.program.id, x.score]),
    a.items.map((x) => [x.view.program.id, x.score]),
  );
  for (const f of ["recommendation.service.ts", "scoring.service.ts", "rules.service.ts", "riasec.service.ts"]) {
    const src = readFileSync(join(process.cwd(), "src/services", f), "utf8");
    assert.ok(!/work-style|workStyle|mbti/i.test(src), f);
  }
});

test("RIASEC: 60 câu, không trùng, câu tình huống ≤ 20 chữ", () => {
  assert.equal(riasecQuestions.length, 60);
  assert.equal(new Set(riasecQuestions.map((q) => q.text)).size, 60);
  for (const q of riasecQuestions) assert.ok(q.text.split(/\s+/).length <= 20, q.text);
  assert.ok(riasecQuestions.some((q) => q.text.startsWith("Quạt ở nhà bị hỏng")));
});
