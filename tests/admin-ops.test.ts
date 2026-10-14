/**
 * Kiểm thử đợt đồng bộ Figma (10/2026): quản trị A01–A09 (dữ liệu thật trong DB), cổng trường C5,
 * kiểm duyệt viên, khoá tài khoản, nhập CSV/XLSX, quy tắc gợi ý + chạy thử, hỏi đáp "Hữu ích/Báo cáo", nhắc riêng học sinh.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { authService } from "../src/services/auth.service";
import { catalogAdminService, checkWebsite } from "../src/services/catalog-admin.service";
import { dataOpsService, dataStatus } from "../src/services/data-ops.service";
import { quizAdminService } from "../src/services/quiz-admin.service";
import { importService, readSheet } from "../src/services/import.service";
import { userAdminService } from "../src/services/user-admin.service";
import { rulesService } from "../src/services/rules.service";
import { schoolPortalService } from "../src/services/school-portal.service";
import { qaService } from "../src/services/community.service";
import { classService } from "../src/services/class.service";
import { programService } from "../src/services/program.service";
import { parseCsv, parseXlsx } from "../src/lib/sheet";
import { repositories } from "../src/repositories";
import type { PublicUser } from "../src/domain/types";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-admin-")), "db.json");
const reset = (t: string) => `https://example.test/reset?t=${t}`;
const get = async (id: string): Promise<PublicUser> => {
  const u = await authService.getUser(id);
  assert.ok(u, id);
  return u;
};

test("A02/A03: thêm trường kiểm tra từng ô, ngành mới ở trạng thái Chờ duyệt, ẩn không mất dữ liệu", async () => {
  const admin = await get("u-000");
  const bad = await catalogAdminService.saveSchool(admin, { name: "ĐH ABC", code: "", type: "cong-lap", city: "" });
  assert.equal(bad.ok, false);
  assert.equal(!bad.ok && bad.field, "code");
  const noCity = await catalogAdminService.saveSchool(admin, { name: "ĐH ABC Demo", code: "ABCX", type: "cong-lap", city: "" });
  assert.equal(!noCity.ok && noCity.message, "Vui lòng chọn khu vực");
  const ok = await catalogAdminService.saveSchool(admin, { name: "Trường Đại học ABC Demo", code: "ABCX", type: "tu-thuc", city: "Hà Nội", website: "abc.edu.vn" });
  assert.ok(ok.ok);
  assert.equal(ok.ok && ok.warning, "URL chưa được xác minh (không phải https hoặc không thuộc .edu.vn)");
  assert.equal((checkWebsite("https://tuyensinh.abc.edu.vn") as { warning: string | null }).warning, null);
  const dup = await catalogAdminService.saveSchool(admin, { name: "Trùng mã", code: "ABCX", type: "tu-thuc", city: "Hà Nội" });
  assert.equal(!dup.ok && dup.field, "code");
  // Trường mới xuất hiện ở trang công khai; ẩn → biến mất nhưng vẫn còn trong quản trị.
  assert.ok((await repositories.schools.findAll()).some((s) => s.code === "ABCX"));
  assert.ok(ok.ok);
  if (ok.ok) {
    await catalogAdminService.setSchoolHidden(admin, ok.id, true);
    assert.ok(!(await repositories.schools.findAll()).some((s) => s.code === "ABCX"));
    assert.ok((await catalogAdminService.schools()).some((r) => r.school.code === "ABCX" && r.school.hidden));
  }
  const major = await catalogAdminService.saveMajor(admin, { code: "7999901", name: "Ngành thử nghiệm", groupId: "cntt", riasec: ["I", "R", "C"], summary: "Ngành dùng cho kiểm thử tự động." });
  assert.ok(major.ok);
  if (major.ok) {
    assert.equal(await repositories.majors.findBySlug("nganh-thu-nghiem"), null, "ngành mới chưa duyệt không hiện công khai");
    assert.ok(!(await repositories.majors.findAll()).some((m) => m.id === major.id));
    await catalogAdminService.setMajorHidden(admin, major.id, false);
    assert.ok(await repositories.majors.findBySlug("nganh-thu-nghiem"));
  }
});

test("A04: tạo chương trình mới, tạm ẩn → không hiện cho học sinh, quản trị vẫn sửa được", async () => {
  const admin = await get("u-000");
  const r = await catalogAdminService.createProgram(admin, { schoolId: "neu", majorId: "cong-nghe-thong-tin", admissionCode: "KHA-TEST", combos: ["A00", "A01"], quota: 50, tuitionMin: 20, tuitionMax: 25, cutoffs: { 2025: "26.1", 2024: "25.9" }, source: "Đề án thử nghiệm" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(await repositories.programs.findById(r.id));
  assert.equal((await catalogAdminService.createProgram(admin, { schoolId: "neu", majorId: "cong-nghe-thong-tin", admissionCode: "KHA-TEST", combos: ["A00"], quota: 50, tuitionMin: 20, source: "x y z" })).ok, false, "trùng mã xét tuyển");
  await catalogAdminService.setProgramHidden(admin, r.id, true);
  assert.equal(await repositories.programs.findById(r.id), null);
  assert.ok((await programService.listAllAdmin()).some((v) => v.program.id === r.id));
});

test("A01/A05: tổng quan phát hiện vấn đề, xác minh hàng loạt, nguồn https, xoá một năm, CSV an toàn", async () => {
  const admin = await get("u-000");
  const ov = await dataOpsService.overview();
  assert.ok(ov.stats.programs > 50);
  assert.ok(ov.issues.some((i) => i.kind === "missing-source"));
  assert.equal(ov.progress.verified + ov.progress.pending + ov.progress.missing, ov.stats.programs);
  const before = await repositories.catalogAdmin.getProgram("neu-marketing");
  assert.ok(before);
  const v = await dataOpsService.bulkVerify(admin, ["neu-marketing", "khong-ton-tai"]);
  assert.ok(v.ok && v.verified === 1 && v.skipped === 1);
  assert.equal(dataStatus((await repositories.catalogAdmin.getProgram("neu-marketing"))!), "verified");
  assert.equal((await dataOpsService.saveSource(admin, "neu-marketing", { sourceUrl: "http://neu.edu.vn" })).ok, false, "chỉ nhận https");
  assert.equal((await dataOpsService.saveSource(admin, "neu-marketing", { sourceUrl: "https://neu.edu.vn/de-an", sourceCheckedAt: "2999-01-01" })).ok, false, "ngày tương lai");
  assert.ok((await dataOpsService.saveSource(admin, "neu-marketing", { sourceUrl: "https://neu.edu.vn/de-an", sourceCheckedAt: "2026-09-20", sourceNote: "Đối chiếu đề án" })).ok);
  assert.equal((await repositories.catalogAdmin.getProgram("neu-marketing"))!.sourceUrl, "https://neu.edu.vn/de-an");
  const y = before!.cutoffs[0].year;
  assert.ok((await dataOpsService.clearYear(admin, "neu-marketing", y)).ok);
  assert.ok(!(await repositories.catalogAdmin.getProgram("neu-marketing"))!.cutoffs.some((c) => c.year === y));
  const csv = dataOpsService.toCsv([{ ...(await dataOpsService.scoreRows())[0], name: "=HYPERLINK(\"x\")" }]);
  assert.ok(csv.startsWith("﻿ma_xet_tuyen"));
  assert.ok(csv.includes("'=HYPERLINK"), "chặn công thức trong CSV");
});

test("A06: sửa/ẩn câu hỏi giữ tối thiểu mỗi nhóm, thêm câu, trọng số 0,5–2,0", async () => {
  const admin = await get("u-000");
  const { questions } = await quizAdminService.get();
  const r = questions.filter((q) => q.type === "R");
  assert.ok((await quizAdminService.question(admin, { action: "edit", id: r[0].id, text: "Tôi thích sửa chữa xe đạp và đồ gia dụng.", type: "R" })).ok);
  for (let i = 0; i < r.length - 3; i++) assert.ok((await quizAdminService.question(admin, { action: "hide", id: r[i].id })).ok);
  const tooMany = await quizAdminService.question(admin, { action: "hide", id: r[r.length - 1].id });
  assert.equal(tooMany.ok, false, "không được ẩn dưới 3 câu");
  const visible = await repositories.quiz.findQuestions();
  assert.equal(visible.filter((q) => q.type === "R").length, 3);
  const add = await quizAdminService.question(admin, { action: "add", text: "Tôi thích lắp ráp mô hình robot.", type: "R" });
  assert.ok(add.ok && add.id! >= 1000);
  assert.equal((await quizAdminService.saveWeights(admin, { R: 1, I: 1, A: 1, S: 1, E: 2.5, C: 1 })).ok, false);
  assert.ok((await quizAdminService.saveWeights(admin, { R: 1, I: 1, A: 1, S: 1, E: 1.2, C: 1 })).ok);
  assert.equal((await quizAdminService.get()).typeWeights.E, 1.2);
});

test("A07: đọc CSV/XLSX, lỗi & cảnh báo theo dòng, công bố bỏ qua dòng lỗi", async () => {
  const admin = await get("u-000");
  assert.deepEqual(parseCsv('a;b\n"x;y";2\n'), [["a", "b"], ["x;y", "2"]]);
  const csv = [
    "ma_xet_tuyen,ten_chuong_trinh,ma_truong,ma_nganh,nam,diem_chuan,hoc_phi_min,hoc_phi_max,chi_tieu,to_hop,nguon",
    "MKT01,Marketing,KHA,,2026,27.1,,,,,https://neu.edu.vn/de-an",
    ",Thiếu mã,KHA,,2026,25,,,,,",
    "X1,Điểm sai,KHA,,2026,32.5,,,,,",
    "X2,Không có trường,ZZZ,,2026,25,,,,,",
    "NEW1,Ngành mới,KHA,7480201,2026,24.5,20,24,80,A00 A01,web cá nhân",
  ].join("\n");
  const pv = await importService.previewFile("diem.csv", csv);
  assert.ok(pv.ok);
  if (!pv.ok) return;
  const rows = pv.preview.rows;
  assert.equal(rows[1].errors[0].message, "Thiếu mã xét tuyển");
  assert.ok(rows[2].errors.some((e) => e.message.includes("> 30")));
  assert.ok(rows[3].errors.some((e) => e.field === "ma_truong"));
  assert.ok(rows[4].warnings.some((w) => w.message.includes("chưa chính thức")));
  const pub = await importService.publish(admin, "diem.csv", rows.map((r) => r.data));
  assert.ok(pub.ok);
  assert.equal(pub.ok && pub.created, 1);
  assert.ok((await importService.history()).length >= 1);
  // XLSX tối giản (zip deflate) đọc được chuỗi dùng chung.
  const xlsx = makeXlsx([["ma_xet_tuyen", "ma_truong", "nam", "diem_chuan"], ["7340115", "KHA", "2026", "27"]]);
  assert.deepEqual(parseXlsx(xlsx)[1], ["7340115", "KHA", "2026", "27"]);
  assert.ok(readSheet("a.xlsx", xlsx.toString("base64")).ok);
  assert.equal(readSheet("a.pdf", "x").ok, false);
});

test("A08: khoá tài khoản chặn đăng nhập & thu hồi phiên, không tự khoá/xoá mình, cấp kiểm duyệt viên", async () => {
  const admin = await get("u-000");
  const an = await get("u-001");
  assert.equal((await userAdminService.action(admin, admin.id, { action: "lock" }, reset)).ok, false);
  const sv = await authService.getSessionVersion(an.id);
  assert.ok((await userAdminService.action(admin, an.id, { action: "lock" }, reset)).ok);
  assert.equal((await authService.login("an@trovio.vn", "Trovio@2026")).ok, false);
  assert.equal(await authService.getUserForSession(an.id, sv + 1), null, "phiên bị chặn khi khoá");
  assert.ok((await userAdminService.action(admin, an.id, { action: "unlock" }, reset)).ok);
  assert.ok((await authService.login("an@trovio.vn", "Trovio@2026")).ok);
  assert.ok((await userAdminService.action(admin, an.id, { action: "moderator", value: true }, reset)).ok);
  assert.equal((await get(an.id)).moderator, true);
  const created = await userAdminService.create(admin, { name: "Cô Mai", email: "mai.test@example.com", role: "teacher" }, reset);
  assert.ok(created.ok);
  assert.equal((await userAdminService.create(admin, { name: "Cô Mai", email: "mai.test@example.com" }, reset)).ok, false);
  if (created.ok) {
    assert.equal((await userAdminService.action(admin, created.id, { action: "delete", confirm: "sai@x.com" }, reset)).ok, false);
    assert.ok((await userAdminService.action(admin, created.id, { action: "delete", confirm: "mai.test@example.com" }, reset)).ok);
  }
  const { stats } = await userAdminService.list();
  assert.ok(stats.total >= 5);
});

test("A09: trọng số phải cộng 100, quy tắc bản nháp, chạy thử trả top 3", async () => {
  const admin = await get("u-000");
  assert.equal((await rulesService.saveWeights(admin, { interest: 50, fit: 30, place: 10, group: 5 })).ok, false);
  assert.ok((await rulesService.saveWeights(admin, { interest: 40, fit: 40, place: 10, group: 10 })).ok);
  const created = await rulesService.ruleAction(admin, { action: "create", kind: "boost-school-type", name: "Ưu tiên công lập", params: { schoolType: "cong-lap", points: 5 } });
  assert.ok(created.ok);
  const cfg = await rulesService.get();
  assert.equal(cfg.rules.find((r) => r.name === "Ưu tiên công lập")?.status, "draft");
  const sim = await rulesService.simulate({ code: "IRC", score: "26", budget: "40", region: "bac", weights: { interest: 40, fit: 40, place: 10, group: 10 }, includeDrafts: true });
  assert.ok(sim.items.length > 0 && sim.items.length <= 3);
  assert.ok(sim.items.every((i) => i.match >= 0 && i.match <= 100));
});

test("C5: cổng trường — chỉ cán bộ đã duyệt, xác nhận đủ 4 nhóm → huy hiệu, bản sửa chờ duyệt", async () => {
  const admin = await get("u-000");
  const staff = await get("u-005");
  const an = await get("u-001");
  assert.equal(await schoolPortalService.dashboard(an), null);
  assert.equal((await schoolPortalService.confirm(an, "neu-marketing", "cutoff")).ok, false);
  assert.equal((await schoolPortalService.confirm(staff, "ftu-marketing", "cutoff")).ok, false, "không xác nhận trường khác");
  const res = await schoolPortalService.confirm(staff, "neu-ke-toan", "all");
  assert.ok(res.ok && res.complete);
  assert.ok((await repositories.catalogAdmin.getProgram("neu-ke-toan"))!.schoolVerifiedAt);
  assert.equal((await schoolPortalService.submit(staff, { programId: "neu-ke-toan", field: "quota", proposed: "320", evidenceUrl: "http://x" })).ok, false, "minh chứng https");
  const sub = await schoolPortalService.submit(staff, { programId: "neu-ke-toan", field: "quota", proposed: "320", evidenceUrl: "https://neu.edu.vn/thong-bao" });
  assert.ok(sub.ok);
  assert.notEqual((await repositories.catalogAdmin.getProgram("neu-ke-toan"))!.quota, 320, "chưa duyệt thì chưa đổi");
  if (sub.ok) {
    assert.equal((await schoolPortalService.resolve(admin, sub.id, { action: "reject" })).ok, false, "từ chối cần lý do");
    assert.ok((await schoolPortalService.resolve(admin, sub.id, { action: "approve" })).ok);
  }
  assert.equal((await repositories.catalogAdmin.getProgram("neu-ke-toan"))!.quota, 320);
  // Đăng ký mới: email phải thuộc tên miền trường.
  assert.equal((await schoolPortalService.request(an, "neu")).ok, false);
});

test("C1: hữu ích/báo cáo câu trả lời (3 báo cáo → ẩn), nhắc riêng học sinh có giới hạn", async () => {
  const qs = await repositories.qa.list();
  const q = qs.find((x) => x.status === "approved" && x.answers.some((a) => a.status === "approved"))!;
  const a = q.answers.find((x) => x.status === "approved")!;
  const voters = [await get("u-000"), await get("u-003"), await get("u-001")];
  const h1 = await qaService.voteAnswer(voters[0], q.id, a.id, "helpful");
  assert.ok(h1.ok && h1.votedHelpful);
  const h2 = await qaService.voteAnswer(voters[0], q.id, a.id, "helpful");
  assert.ok(h2.ok && !h2.votedHelpful, "bấm lại = bỏ");
  for (const v of voters) await qaService.voteAnswer(v, q.id, a.id, "report");
  assert.equal((await qaService.voteAnswer(voters[0], q.id, a.id, "report")).ok, false);
  assert.equal((await repositories.qa.findById(q.id))!.answers.find((x) => x.id === a.id)!.status, "pending");

  const gv = await get("u-003");
  const cls = (await classService.listMine(gv))[0];
  const dash = await classService.dashboard(gv, cls.id);
  assert.ok(dash && dash.members.length > 0);
  const key = dash!.members[0].key;
  assert.ok(!/u-\d/.test(key), "không lộ id tài khoản");
  assert.ok((await classService.remindMember(gv, cls.id, { memberKey: key })).ok);
  assert.equal((await classService.remindMember(gv, cls.id, { memberKey: key })).ok, false, "24 giờ / học sinh");
  assert.equal((await classService.remindMember(await get("u-001"), cls.id, { memberKey: key })).ok, false);
});

/** Tạo file .xlsx tối thiểu (sheet1 + sharedStrings) để kiểm thử bộ đọc. */
function makeXlsx(rows: string[][]): Buffer {
  const shared: string[] = [];
  const idx = (s: string) => (shared.includes(s) ? shared.indexOf(s) : shared.push(s) - 1);
  const col = (i: number) => String.fromCharCode(65 + i);
  const sheet = `<worksheet><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => `<c r="${col(ci)}${ri + 1}" t="s"><v>${idx(c)}</v></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const sst = `<sst>${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`;
  const files: [string, Buffer][] = [
    ["xl/worksheets/sheet1.xml", Buffer.from(sheet)],
    ["xl/sharedStrings.xml", Buffer.from(sst)],
  ];
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const comp = deflateRawSync(data);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, comp);
    centrals.push(ch, n);
    offset += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
