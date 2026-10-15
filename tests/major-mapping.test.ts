import { test } from "node:test";
import assert from "node:assert/strict";
import type { Major, MajorGroup } from "../src/domain/types";
import {
  defaultRiasecForGroup,
  findMajorForImport,
  inferMajorGroupId,
  normalizeMajorIdentity,
} from "../src/services/major-mapping.service";

const groups: MajorGroup[] = [
  { id: "cntt", slug: "cntt", name: "Công nghệ & CNTT", icon: "code", tone: "primary" },
  { id: "kinh-te", slug: "kinh-te", name: "Kinh tế", icon: "chart", tone: "accent" },
  { id: "y-duoc", slug: "y-duoc", name: "Y Dược", icon: "heart", tone: "danger" },
  { id: "ky-thuat", slug: "ky-thuat", name: "Kỹ thuật", icon: "gear", tone: "teal" },
  { id: "xa-hoi", slug: "xa-hoi", name: "Xã hội", icon: "users", tone: "violet" },
  { id: "nghe-thuat", slug: "nghe-thuat", name: "Nghệ thuật", icon: "pen", tone: "pink" },
  { id: "giao-duc", slug: "giao-duc", name: "Giáo dục", icon: "book", tone: "success" },
  { id: "nong-lam", slug: "nong-lam", name: "Nông lâm", icon: "leaf", tone: "slate" },
];

const major = (id: string, name: string, code = "7480201"): Major => ({
  id,
  slug: id,
  code,
  name,
  groupId: "cntt",
  riasec: ["I", "R", "C"],
  summary: "",
  description: "",
  curriculum: [],
  careers: [],
  demand: "Trung bình",
  growth: 0,
});

test("import không gộp các ngành khác tên chỉ vì trùng mã ngành", () => {
  const majors = [
    major("software", "Kỹ thuật phần mềm"),
    major("ai", "Trí tuệ nhân tạo"),
  ];

  assert.equal(findMajorForImport(majors, "Trí tuệ nhân tạo", "7480201")?.id, "ai");
  assert.equal(findMajorForImport(majors, "An toàn thông tin", "7480201"), undefined);
  assert.equal(findMajorForImport(majors, "7480201", "7480201")?.id, "software");
});

test("định danh ngành không phụ thuộc dấu và dấu câu", () => {
  assert.equal(normalizeMajorIdentity("  Kỹ thuật - Phần mềm "), "ky thuat phan mem");
  assert.equal(findMajorForImport([major("software", "Kỹ thuật phần mềm")], "Ky thuat phan-mem")?.id, "software");
});

test("ngành mới giữ đúng nhóm theo mã chuẩn, không nhảy nhóm vì từ trong tên", () => {
  assert.equal(inferMajorGroupId("Kỹ thuật phần mềm", "7480201", groups), "cntt");
  assert.equal(inferMajorGroupId("Kế toán", "7340301", groups), "kinh-te");
  assert.equal(inferMajorGroupId("Điều dưỡng", "7720301", groups), "y-duoc");
  assert.equal(inferMajorGroupId("Sư phạm Toán học", "7140209", groups), "giao-duc");
  assert.equal(inferMajorGroupId("Sư phạm Ngôn ngữ Anh", "7140231", groups), "giao-duc");
  assert.equal(inferMajorGroupId("Luật kinh tế", "7380107", groups), "xa-hoi");
  assert.equal(inferMajorGroupId("Kỹ thuật môi trường", "7520320", groups), "ky-thuat");
  assert.equal(inferMajorGroupId("Thương mại điện tử", "7340122", groups), "kinh-te");
  assert.equal(inferMajorGroupId("Logistics và quản lý chuỗi cung ứng", "7510605", groups), "ky-thuat");
  assert.equal(inferMajorGroupId("Toán học", "7460101", groups), "ky-thuat");
  assert.equal(inferMajorGroupId("Sinh học", "7420201", groups), "nong-lam");
  assert.equal(inferMajorGroupId("Hóa học", "7440112", groups), "ky-thuat");
  assert.equal(inferMajorGroupId("Quản lý tài nguyên và môi trường", "7850101", groups), "nong-lam");
  assert.equal(inferMajorGroupId("Ngành chưa đặt tên", "7489999", groups), "cntt");
});

test("khi không có mã thuộc nhóm nào thì mới phân theo tên, vẫn không nhảy ngẫu nhiên", () => {
  assert.equal(inferMajorGroupId("Kế toán", "", groups), "kinh-te");
  assert.equal(inferMajorGroupId("Sư phạm Ngôn ngữ Anh", "", groups), "giao-duc");
  assert.equal(inferMajorGroupId("Thương mại điện tử", "", groups), "kinh-te");
  assert.equal(inferMajorGroupId("Kinh tế dữ liệu", "7990001", groups), "kinh-te");
  assert.equal(inferMajorGroupId("Điều dưỡng", undefined, groups), "y-duoc");
});

test("RIASEC mặc định thay đổi theo nhóm ngành", () => {
  assert.deepEqual(defaultRiasecForGroup("nghe-thuat"), ["A", "S", "E"]);
  assert.deepEqual(defaultRiasecForGroup("y-duoc"), ["S", "I", "R"]);
});
