import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { SuggestionDataManager } from "@/components/admin/suggestion-data-manager";
import { interestService } from "@/services";


export const metadata: Metadata = { title: "Dữ liệu gợi ý ngành", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSuggestionDataPage() {
  await adminPage("/quan-tri/goi-y-nganh");
  const [interests, subjectLinks, majors, subjects, careers] = await Promise.all([
    interestService.listAdmin(),
    interestService.listSubjectLinks(),
    interestService.adminMajorOptions(),
    interestService.adminSubjectOptions(),
    interestService.adminCareerOptions(),
  ]);
  return (
    <>
      <AdminHeader title="Dữ liệu gợi ý ngành" crumb="Dữ liệu gợi ý ngành" />
      <AdminBody>
        <p className="max-w-3xl text-sm text-slate-600">
          Quản lý danh sách sở thích, lĩnh vực nghề nghiệp và các liên kết với ngành học, môn thế mạnh. Gợi ý dựa trên các liên kết này, không dùng công thức tính điểm trọng số phức tạp.
        </p>
        <SuggestionDataManager
          interests={interests}
          majors={majors.filter((m) => !m.hidden).map((m) => ({ id: m.id, name: m.name }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          subjectLinks={subjectLinks}
          careers={careers}
        />
      </AdminBody>
    </>
  );
}
