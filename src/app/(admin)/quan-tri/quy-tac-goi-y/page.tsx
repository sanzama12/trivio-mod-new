import type { Metadata } from "next";
import { LuCircleCheck, LuCircleX, LuCpu, LuFileText } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { CREATABLE_KINDS, PARAM_LABELS, PARAM_RULES, RULE_KIND_LABELS, rulesService, WEIGHT_LABELS } from "@/services/rules.service";
import { SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, StatGrid } from "@/components/admin/ui";
import { RulesManager } from "@/components/admin/rules-manager";

export const metadata: Metadata = { title: "Cấu hình Quy tắc gợi ý", robots: { index: false, follow: false } };

export default async function AdminRulesPage() {
  await adminPage("/quan-tri/quy-tac-goi-y");
  const cfg = await rulesService.get();
  const count = (s: string) => cfg.rules.filter((r) => r.status === s).length;
  return (
    <>
      <AdminHeader title="Cấu hình Quy tắc gợi ý" crumb="Quy tắc gợi ý" updatedAt={cfg.updatedAt} />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng quy tắc" value={cfg.rules.length} hint="Quy tắc gốc + quy tắc bổ sung" hintTone="success" Icon={LuCpu} />
          <AdminStat label="Đang áp dụng" value={count("active")} hint="Ảnh hưởng ngay tới trang Gợi ý" hintTone="success" Icon={LuCircleCheck} tone="success" />
          <AdminStat label="Bản nháp" value={count("draft")} hint="Chạy thử trước khi bật" hintTone="accent" Icon={LuFileText} tone="accent" />
          <AdminStat label="Đã vô hiệu" value={count("disabled")} hint="Có thể tái kích hoạt" hintTone="danger" Icon={LuCircleX} tone="danger" />
        </StatGrid>
        <RulesManager
          weights={cfg.weights}
          rules={cfg.rules}
          labels={{ weights: WEIGHT_LABELS, kinds: RULE_KIND_LABELS, params: PARAM_LABELS, schoolTypes: SCHOOL_TYPE_LABELS }}
          paramRules={PARAM_RULES}
          creatable={CREATABLE_KINDS}
        />
      </AdminBody>
    </>
  );
}
