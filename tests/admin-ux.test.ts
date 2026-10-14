/** Kiểm thử nhỏ cho cải tiến UX trang quản trị: nhật ký hiển thị bằng tiếng Việt, không lộ tên trường kỹ thuật. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeAudit, FIELD_LABEL } from "../src/domain/audit-labels";

test("nhật ký: mô tả ngắn bằng tiếng Việt", () => {
  assert.equal(describeAudit({ action: "update", targetType: "timeline", changes: [{ field: "season", before: "a", after: "b" }, { field: "events", before: "1", after: "2" }, { field: "official", before: "x", after: "y" }] }), "Cập nhật mốc tuyển sinh · Mùa tuyển sinh (+2)");
  assert.equal(describeAudit({ action: "create", targetType: "chat-alias", changes: [{ field: "alias", before: "", after: "x" }] }), "Thêm từ khoá chatbot · Từ khoá");
  assert.equal(describeAudit({ action: "delete", targetType: "school", changes: [{ field: "*", before: "", after: "" }] }), "Xoá trường");
  assert.equal(describeAudit({ action: "verify", changes: [] }), "Đã kiểm tra chương trình");
  assert.equal(FIELD_LABEL["*"], "Toàn bộ");
});
