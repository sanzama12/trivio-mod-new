import type { Metadata } from "next";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { ScoreWizard } from "@/components/score/score-wizard";

export const metadata: Metadata = { title: "Nhập điểm & điều kiện" };

export default async function ScorePage() {
  const [combos, subjects, groups] = await Promise.all([catalogService.getCombos(), catalogService.getSubjects(), catalogService.getGroupsWithCounts()]);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Cá nhân hoá gợi ý" }]} />
      <div className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Cá nhân hoá kết quả gợi ý</h1>
        <p className="mt-1 text-sm text-slate-500">3 bước, khoảng 1 phút. Trovio dùng thông tin này để đánh dấu chương trình An toàn / Vừa sức / Thử sức.</p>
      </div>
      <div className="mt-6">
        <ScoreWizard combos={combos} subjects={subjects} groups={groups.map((g) => g.group)} />
      </div>
    </div>
  );
}
