import test from "node:test";
import assert from "node:assert/strict";
import { fmt, mergeEditableCutoffs, validateProgramEdit } from "../../src/services/admin.service";
import { evaluateProgramFit, fitForProfile } from "../../src/services/scoring.service";
import { answerQuestion } from "../../src/services/chatbot.service";
import { repositories } from "../repositories";
import { journeyKey, mergeGuestJourney } from "../../src/lib/journey";
import type { MethodCutoff } from "../../src/domain/types";

test("nhật ký hiển thị key khi phương thức không có nhãn", () => {
  assert.equal(fmt("altCutoffs", [{ method: "tsa", year: 2026, score: 79.26 }]), "tsa 2026: 79.26");
});

test("sửa học bạ giữ phương thức form không hiển thị", () => {
  const input = validateProgramEdit({ altCutoffs: [{ method: "hocba", year: 2026, score: 25 }] });
  assert.ok(input.ok);
  const existing = [{ method: "tsa", year: 2026, score: 79.26 }, { method: "dgnl-hcm", year: 2026, score: 900 }, { method: "hocba", year: 2025, score: 24 }] as MethodCutoff[];
  assert.deepEqual(mergeEditableCutoffs(existing, input.patch.altCutoffs!), [existing[0], existing[1], { method: "hocba", year: 2026, score: 25 }]);
  assert.deepEqual(mergeEditableCutoffs(existing, []), existing.slice(0, 2));
});

test("đánh giá thẻ tìm kiếm và chi tiết cùng tổ hợp tốt nhất", () => {
  const profile = { method: "thpt" as const, methods: ["thpt" as const], combo: "D01", scores: { toan: 5, van: 5, anh: 5, ly: 10, hoa: 10 }, priorityRegion: "KV3" as const, priorityGroup: "none" as const, admission: { rawTotal: 15 } };
  const program = { combos: ["A00", "A01", "D01"], cutoffs: [{ year: 2026, score: 15 }] };
  const card = evaluateProgramFit(profile, program);
  const detail = fitForProfile(profile, program);
  assert.equal(card?.combo, "A00");
  assert.equal(card?.total, 25);
  assert.deepEqual(card?.fit, detail.fit);
  assert.equal(card?.fit.level, "an-toan");
});

test("câu ngoài tuyển sinh trên trang chương trình không dùng ngữ cảnh", async (t) => {
  t.mock.method(repositories.majors, "findAll", async () => [{ id: "m", slug: "may-tinh", name: "Máy tính", summary: "Ngành máy tính", riasec: [] }] as never);
  t.mock.method(repositories.schools, "findAll", async () => [{ id: "s", slug: "truong", name: "Trường A", shortName: "A", code: "AAA" }] as never);
  t.mock.method(repositories.programs, "findAll", async () => [{ slug: "may-tinh-truong", majorId: "m", schoolId: "s", cutoffs: [], altCutoffs: [] }] as never);
  t.mock.method(repositories.chatAliases, "list", async () => []);
  const result = await answerQuestion("Giá bitcoin hôm nay", { page: "/chuong-trinh/may-tinh-truong" });
  assert.equal(result.kind, "unknown");
  assert.equal(result.intent, "unknown");
});


test("tiến độ khách chỉ gộp vào chủ nhận và không lẫn giữa tài khoản", (t) => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  t.after(() => { Reflect.deleteProperty(globalThis, "localStorage"); });
  storage.setItem(journeyKey("explored", null), "1");
  mergeGuestJourney("A");
  assert.equal(storage.getItem(journeyKey("explored", "A")), "1");
  assert.equal(storage.getItem(journeyKey("explored", null)), null);
  mergeGuestJourney("B");
  assert.equal(storage.getItem(journeyKey("explored", "B")), null);
});
