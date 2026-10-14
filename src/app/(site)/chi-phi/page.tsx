import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { CostCompare } from "@/components/program/cost-compare";
import { FinancialAid } from "@/components/program/financial-aid";
import { repositories } from "@/repositories";

export const metadata: Metadata = { title: "Tính tổng chi phí học", description: "Ước tính tổng chi phí cả khoá và các hỗ trợ có thể nhận: học bổng, miễn giảm học phí, vay vốn sinh viên, ký túc xá." };

export default async function CostPage() {
  const financialAid = await repositories.catalog.findFinancialAid();
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tính tổng chi phí học" }]} />
      <div className="mt-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Tính tổng chi phí học</h1>
        <p className="mt-1 text-sm text-slate-600">
          So sánh tổng chi phí cả khoá của các chương trình bạn đã lưu: học phí × số năm (có thể tính tăng học phí, học bổng) cộng sinh hoạt phí. Các giả định do bạn nhập — không lưu lên máy chủ.
        </p>
      </div>
      <CostCompare />
      <FinancialAid config={financialAid} />
    </div>
  );
}
