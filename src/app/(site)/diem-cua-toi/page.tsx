import type { Metadata } from "next";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { ScoreWizard } from "@/components/score/score-wizard";

export const metadata: Metadata = { title: "Điểm & hồ sơ xét tuyển" };

export default async function ScorePage() {
  const [combos, subjects, groups, majors] = await Promise.all([
    catalogService.getCombos(),
    catalogService.getSubjects(),
    catalogService.getGroupsWithCounts(),
    catalogService.getMajors(),
  ]);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Điểm & hồ sơ xét tuyển" }]} />
      <div className="mx-auto mt-6 max-w-3xl min-w-0">
        <h1 className="text-left text-3xl md:text-4xl font-bold tracking-tight">Điểm & hồ sơ xét tuyển</h1>
        <p className="mt-1 text-sm text-slate-600">
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
