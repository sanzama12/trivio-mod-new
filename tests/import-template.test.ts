import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { filterKnownComboCodes, IMPORT_COLUMNS, importIdentityKey, importRowIdentityKey, importService, readSheet } from "../src/services/import.service";

test("A07 template: Excel đầy đủ cột, khóa mã xét tuyển đứng đầu và cho phép ô trống", async () => {
  const content = await importService.templateXlsx();
  assert.ok(content.byteLength > 5_000);

  const workbook = new ExcelJS.Workbook();
  // ExcelJS dùng kiểu Buffer nội bộ cũ hơn @types/node hiện tại.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(content as any);
  const input = workbook.getWorksheet("Nhap lieu");
  assert.ok(input);
  const headerValues = input.getRow(1).values as ExcelJS.CellValue[];
  assert.deepEqual(
    headerValues.slice(1, IMPORT_COLUMNS.length + 1),
    [...IMPORT_COLUMNS],
  );
  assert.equal(input.getCell("A2").value, "7480201");
  assert.equal(input.getCell("I3").value, "", "điểm chuẩn mẫu có thể để trống");
  assert.equal((input.getCell("A1").font.color as { argb?: string })?.argb, "FFFFFFFF");
  assert.equal((input.getCell("A2").font.color as { argb?: string })?.argb, "FF1D4ED8");
  assert.equal(input.views[0]?.state, "frozen");
  assert.ok(workbook.getWorksheet("Huong dan"));

  const parsed = await readSheet("mau.xlsx", content.toString("base64"));
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[1].ma_xet_tuyen, "7340115");
    assert.equal(parsed.rows[1].diem_chuan, "");
    assert.equal(parsed.rows[1].hoc_phi_min, "");
  }
});

test("A07 key: không tự sinh mã xét tuyển từ tên chương trình", async () => {
  const missingHeader = await readSheet("sai.csv", "ten_chuong_trinh,ma_truong\nMarketing,CEA\n");
  assert.equal(missingHeader.ok, false);

  const blankKey = await readSheet(
    "thieu-id.csv",
    "ma_xet_tuyen,ten_chuong_trinh,ma_truong,diem_chuan\n,Marketing,CEA,\n",
  );
  assert.ok(blankKey.ok);
  if (blankKey.ok) assert.equal(blankKey.rows[0].ma_xet_tuyen, "");
});

test("A07 key: mã trường được lặp nhưng ID ngành phải khác trong cùng trường", () => {
  const ceaIt = importIdentityKey({ ma_truong: "CEA", ma_xet_tuyen: "7480201" });
  const ceaMarketing = importIdentityKey({ ma_truong: "CEA", ma_xet_tuyen: "7340115" });
  const otherSchoolIt = importIdentityKey({ ma_truong: "BMU", ma_xet_tuyen: "7480201" });

  assert.notEqual(ceaIt, ceaMarketing, "cùng trường nhưng ID ngành khác nhau là hợp lệ");
  assert.notEqual(ceaIt, otherSchoolIt, "cùng ID ngành ở hai trường khác nhau là hai khóa khác nhau");
  assert.equal(ceaIt, importIdentityKey({ ma_truong: "cea", ma_xet_tuyen: "7480201" }));
});

test("A07 row key: cùng trường/ngành vẫn nhận khi khác phương thức", () => {
  const thpt = importRowIdentityKey({ ma_truong: "BKA", ma_xet_tuyen: "IT1", phuong_thuc: "Điểm thi THPT" });
  const hocBa = importRowIdentityKey({ ma_truong: "BKA", ma_xet_tuyen: "IT1", phuong_thuc: "Điểm học bạ" });
  const sameThpt = importRowIdentityKey({ ma_truong: "bka", ma_xet_tuyen: "it1", phuong_thuc: "điểm thi thpt" });
  const otherSchool = importRowIdentityKey({ ma_truong: "HUST", ma_xet_tuyen: "IT1", phuong_thuc: "Điểm thi THPT" });

  assert.notEqual(thpt, hocBa);
  assert.notEqual(thpt, otherSchool);
  assert.equal(thpt, sameThpt);
});

test("A07 combos: loại mã tổ hợp không có trong danh mục trước khi ghi database", () => {
  const known = new Set(["A00", "A01", "D01"]);
  assert.deepEqual(filterKnownComboCodes("A00; X99 / D01 A00", known), ["A00", "D01"]);
});
