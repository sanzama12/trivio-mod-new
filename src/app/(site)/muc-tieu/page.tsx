import type { Metadata } from "next";
import { catalogService } from "@/services";
import { toLiteMajor, toLiteProgram } from "@/services/lite";
import { Breadcrumb } from "@/components/ui/misc";
import { GoalChat } from "@/components/goal/goal-chat";

export const metadata: Metadata = { title: "Đặt mục tiêu cùng trợ lý", description: "4 câu ngắn: ngành, tổ hợp hợp lệ, điểm mục tiêu so với điểm chuẩn 3 năm, khu vực và ngân sách." };

export default async function GoalPage() {
  const { programs: views, majors, combos } = await catalogService.getGuidanceOptions();
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Gợi ý dành cho bạn", href: "/goi-y" }, { label: "Đặt mục tiêu" }]} />
      <GoalChat majors={majors.map(toLiteMajor)} programs={views.map(toLiteProgram)} combos={combos} />
    </div>
  );
}
