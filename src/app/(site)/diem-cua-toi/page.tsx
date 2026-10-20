import type { Metadata } from "next";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { ScoreWizard } from "@/components/score/score-wizard";

export const metadata: Metadata = { title: "Hồ sơ học tập & xét tuyển" };

export default async function ScorePage() {
  const [combos, subjects, groups, majors] = await Promise.all([
    catalogService.getCombos(),
    catalogService.getSubjects(),
    catalogService.getGroupsWithCounts(),
    catalogService.getMajors(),
  ]);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Hồ sơ học tập & xét tuyển" }]} />
      <div className="mx-auto mt-6 max-w-3xl min-w-0">
        <h1 className="text-left text-2xl font-black tracking-tight md:text-[28px]">Hồ sơ học tập & xét tuyển</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập điểm các môn theo điểm thi THPT hoặc học bạ, khu vực và học phí. Trovio tính tổ hợp mạnh rồi gợi ý chương trình An toàn / Vừa sức / Thử sức.
        </p>
      </div>
      <div className="mt-6">
        <ScoreWizard
          combos={combos}
          subjects={subjects}
          groups={groups.map((g) => g.group)}
          majors={majors.map((m) => ({ id: m.id, name: m.name, groupId: m.groupId }))}
        />
      </div>
    </div>
  );
}
