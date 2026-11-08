import test from "node:test";
import assert from "node:assert/strict";
import { evaluateProgramFit, fitForProfile } from "../../src/services/scoring.service";

test("chọn A01 được xét khi D01 đang ghim nhưng chương trình không xét D01", () => {
  const profile = { method: "thpt" as const, methods: ["thpt" as const], combo: "D01", scores: { toan: 9, van: 9, anh: 9, ly: 8, hoa: 8 }, priorityRegion: "KV3" as const, priorityGroup: "none" as const, admission: { rawTotal: 27 } };
  const program = { combos: ["A00", "A01"], cutoffs: [{ year: 2026, score: 29.27 }] };
  const result = evaluateProgramFit(profile, program);
  assert.equal(result?.combo, "A01");
  assert.equal(result?.total, 26);
  assert.equal(result?.fit.level, "thu-suc");
  assert.equal(fitForProfile(profile, program).reason, null);
});
