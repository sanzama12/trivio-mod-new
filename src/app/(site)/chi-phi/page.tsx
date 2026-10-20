import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { CostCompare } from "@/components/program/cost-compare";

export const metadata: Metadata = { title: "Tính tổng chi phí học", description: "Tính tổng học phí và sinh hoạt phí từ dữ liệu chương trình cùng các giả định do bạn tự nhập." };

export default function CostPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tính tổng chi phí học" }]} />
      <div className="mt-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Tính tổng chi phí học</h1>
        <p className="mt-1 text-sm text-slate-600">
          So sánh tổng chi phí cả khoá của các chương trình bạn đã lưu: học phí × số năm (có thể tính mức tăng và mức giảm do bạn tự nhập) cộng sinh hoạt phí. Các giả định do bạn nhập — không lưu lên máy chủ.
        </p>
      </div>
      <CostCompare />
    </div>
  );
}
