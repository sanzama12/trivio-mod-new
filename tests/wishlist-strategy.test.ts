/**
 * TEST SUITE: Phân tích chiến lược nguyện vọng (GIAI ĐOẠN 2).
 * - Tôn trọng thứ tự mong muốn thật (preferenceRank).
 * - Không cưỡng ép sắp xếp từ khó xuống dễ.
 * - Cho phép nguyện vọng khó đứng sau nếu đó là mong muốn thật của thí sinh mà không khẳng định sai cơ chế xét tuyển.
 * - Kiểm tra giới hạn 15 nguyện vọng và quy định ngành sư phạm (NV 1–5).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeWishlistStrategy, type StrategyItem } from "../src/services/wishlist-strategy";
import type { ScoreProfile } from "../src/domain/types";

const mockProfile: ScoreProfile = {
  method: "thpt",
  combo: "A00",
  scores: { toan: 8.5, ly: 8.0, hoa: 8.5 },
  priorityRegion: "KV3",
  priorityGroup: "none",
  regions: ["bac"],
  budgetMax: 50,
  schoolTypes: ["cong-lap"],
  groupIds: [],
};

// Điểm chuẩn:
// easyProgram: 22.0 điểm -> user 25.0 -> An toàn (+3.0)
// hardProgram: 27.5 điểm -> user 25.0 -> Thử sức (-2.5)
const easyProgram = {
  id: "prog-easy",
  name: "Kinh tế quốc tế",
  slug: "kinh-te-quoc-te",
  schoolId: "sch-1",
  majorId: "maj-1",
  admissionCode: "KT01",
  trainingType: "Chính quy" as const,
  campus: "Hà Nội",
  tuitionMin: 20,
  tuitionMax: 25,
  durationYears: 4,
  quota: 100,
  competition: "Trung bình" as const,
  overview: "",
  combos: ["A00", "D01"],
  cutoffs: [{ year: 2025, score: 22.0 }],
  altCutoffs: [],
  updatedAt: "2026-03",
  source: "Đề án tuyển sinh",
};

const hardProgram = {
  id: "prog-hard",
  name: "Khoa học máy tính",
  slug: "khoa-hoc-may-tinh",
  schoolId: "sch-1",
  majorId: "maj-2",
  admissionCode: "CS01",
  trainingType: "Chính quy" as const,
  campus: "Hà Nội",
  tuitionMin: 25,
  tuitionMax: 30,
  durationYears: 4,
  quota: 100,
  competition: "Cao" as const,
  overview: "",
  combos: ["A00"],
  cutoffs: [{ year: 2025, score: 27.5 }],
  altCutoffs: [],
  updatedAt: "2026-03",
  source: "Đề án tuyển sinh",
};

const teacherProgram = {
  id: "prog-sp-toan",
  name: "Sư phạm Toán học",
  slug: "su-pham-toan-hoc",
  schoolId: "sch-sp",
  majorId: "maj-sp",
  admissionCode: "7140209",
  trainingType: "Chính quy" as const,
  campus: "Hà Nội",
  tuitionMin: 0,
  tuitionMax: 0,
  durationYears: 4,
  quota: 50,
  competition: "Cao" as const,
  overview: "",
  combos: ["A00"],
  cutoffs: [{ year: 2025, score: 25.0 }],
  altCutoffs: [],
  updatedAt: "2026-03",
  source: "Đề án tuyển sinh",
};

test("Tôn trọng thứ tự mong muốn thật: Thử sức đứng sau An toàn không bị tự động đảo thứ tự", () => {
  // Người dùng chọn: NV1 = Kinh tế (An toàn), NV2 = Khoa học máy tính (Thử sức)
  const items: StrategyItem[] = [
    { id: easyProgram.id, label: "NV1: Kinh tế", program: easyProgram },
    { id: hardProgram.id, label: "NV2: Khoa học máy tính", program: hardProgram },
  ];

  const analysis = analyzeWishlistStrategy(items, mockProfile);
  assert.equal(analysis.items.length, 2);

  // Thứ tự nguyện vọng phản ánh đúng mong muốn người dùng
  assert.equal(analysis.items[0].preferenceRank, 1);
  assert.equal(analysis.items[0].id, easyProgram.id);
  assert.equal(analysis.items[0].riskBand, "An toàn");

  assert.equal(analysis.items[1].preferenceRank, 2);
  assert.equal(analysis.items[1].id, hardProgram.id);
  assert.equal(analysis.items[1].riskBand, "Thử sức");

  // Hệ thống giải thích chiến lược nhưng KHÔNG khẳng định sai là 'nguyện vọng sau không bao giờ được xét'
  const explanation = analysis.items[1].strategyNote;
  assert.ok(explanation.includes("hệ thống xét tuyển"));
  assert.ok(!explanation.includes("sẽ không bao giờ được xét"));
});

test("Kiểm tra cảnh báo giới hạn tối đa 15 nguyện vọng theo Quy chế 2026", () => {
  const sixteenItems: StrategyItem[] = Array.from({ length: 16 }, (_, i) => ({
    id: `item-${i + 1}`,
    label: `Lựa chọn ${i + 1}`,
    program: easyProgram,
  }));

  const analysis = analyzeWishlistStrategy(sixteenItems, mockProfile);
  assert.ok(analysis.warnings.some((w) => w.message.includes("15 nguyện vọng")));
});

test("Kiểm tra cảnh báo ngành đào tạo giáo viên nằm ngoài top 5", () => {
  const sixItems: StrategyItem[] = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `p-${i}`, label: `P${i}`, program: easyProgram })),
    { id: teacherProgram.id, label: "NV6: Sư phạm Toán", program: teacherProgram },
  ];

  const analysis = analyzeWishlistStrategy(sixItems, mockProfile);
  assert.ok(
    analysis.warnings.some((w) => w.message.includes("ngành đào tạo giáo viên") && w.message.includes("nguyện vọng 1 đến 5")),
  );
});
