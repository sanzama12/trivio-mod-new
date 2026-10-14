/**
 * Giữ database/schema.sql khớp với mã nguồn: khi thêm sự kiện thống kê, loại nhật ký, trục phong cách…
 * trong code mà quên cập nhật ràng buộc CHECK của SQL thì test này báo lỗi.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FUNNEL_EVENTS } from "../src/domain/types";
import { TARGET_LABEL, ACTION_LABEL } from "../src/domain/audit-labels";
import { WORK_AXES, MBTI_RE } from "../src/domain/work-style";
import { ADMISSION_METHODS } from "../src/services/scoring.service";
import { RULE_KIND_LABELS } from "../src/services/rules.service";

const sql = readFileSync(join(process.cwd(), "database/schema.sql"), "utf8");
const checkOf = (table: string, col: string) => {
  const block = sql.slice(sql.indexOf(`CREATE TABLE ${table} (`));
  const m = block.match(new RegExp(`${col}[^\\n]*CHECK \\(${col} IN \\(([^)]*)\\)`));
  assert.ok(m, `không thấy CHECK ${table}.${col}`);
  return m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
};

test("schema.sql: giá trị liệt kê khớp code", () => {
  assert.deepEqual(checkOf("analytics_events", "event").sort(), [...FUNNEL_EVENTS].sort());
  assert.deepEqual(checkOf("audit_logs", "target_type").sort(), Object.keys(TARGET_LABEL).sort());
  assert.deepEqual(checkOf("audit_logs", "action").sort(), Object.keys(ACTION_LABEL).sort());
  assert.deepEqual(checkOf("work_axes", "code").sort(), [...WORK_AXES].sort());
  assert.deepEqual(checkOf("admission_methods", "code").sort(), Object.keys(ADMISSION_METHODS).sort());
  assert.deepEqual(checkOf("recommend_rules", "kind").sort(), Object.keys(RULE_KIND_LABELS).sort());
  assert.ok(sql.includes(`'${MBTI_RE.source}'`), "regex MBTI");
  // Mini-test & MBTI không được view/hàm gợi ý nào đọc
  const logic = sql.slice(sql.indexOf("12. HÀM & VIEW"));
  assert.ok(!/work_styles|mbti_codes/.test(logic.slice(0, logic.indexOf("13. CHÚ THÍCH"))));
});
