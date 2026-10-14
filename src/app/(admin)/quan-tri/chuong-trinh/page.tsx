import type { Metadata } from "next";
import { LuBookOpen, LuClock, LuFolderOpen, LuLandmark } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { adminService } from "@/services";
import { repositories } from "@/repositories";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, StatGrid } from "@/components/admin/ui";
import { ProgramManager } from "@/components/admin/program-manager";
import { AuditLog } from "@/components/admin/audit-log";

export const metadata: Metadata = { title: "Quản lý Chương trình đào tạo", robots: { index: false, follow: false } };

export default async function AdminProgramsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await adminPage("/quan-tri/chuong-trinh");
  const { q } = await searchParams;
  const [rows, audit, schools, majors, combos] = await Promise.all([
    adminService.listPrograms(),
    adminService.listAudit(200),
    repositories.catalogAdmin.listSchools(),
    repositories.catalogAdmin.listMajors(),
    repositories.catalog.findCombos(),
  ]);
  const live = rows.filter((r) => !r.view.program.hidden);
  const month = new Date().toISOString().slice(0, 7);
  const names = Object.fromEntries(rows.map(({ view }) => [view.program.id, `${view.program.name} – ${view.school.shortName}`]));
  return (
    <>
      <AdminHeader title="Quản lý Chương trình đào tạo" crumb="Chương trình đào tạo" />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng chương trình" value={live.length} hint={`${rows.filter((r) => r.view.program.custom).length} chương trình do quản trị viên thêm`} hintTone="success" Icon={LuBookOpen} />
          <AdminStat label="Trường tham gia" value={new Set(live.map((r) => r.view.school.id)).size} Icon={LuLandmark} />
          <AdminStat label="Ngành có CT" value={new Set(live.map((r) => r.view.major.id)).size} Icon={LuFolderOpen} tone="success" />
          <AdminStat label="Cập nhật tháng này" value={rows.filter((r) => r.view.program.updatedAt === month || r.edited).length} hint="Có chỉnh sửa so với dữ liệu gốc" Icon={LuClock} tone="accent" />
        </StatGrid>
        <ProgramManager
          initialQuery={typeof q === "string" ? q.slice(0, 80) : ""}
          schools={schools.filter((s) => !s.hidden).map((s) => ({ id: s.id, name: s.shortName }))}
          majors={majors.map((m) => ({ id: m.id, name: m.name, code: m.code }))}
          combos={combos.map((c) => c.code)}
          rows={rows.map(({ view, edited }) => ({
            id: view.program.id,
            code: view.program.admissionCode,
            name: view.program.name,
            schoolId: view.school.id,
            school: view.school.shortName,
            majorId: view.major.id,
            major: view.major.name,
            trainingType: view.program.trainingType,
            cutoff: view.program.cutoffs[0] ?? null,
            tuitionMin: view.program.tuitionMin,
            tuitionMax: view.program.tuitionMax,
            hidden: !!view.program.hidden,
            edited,
          }))}
        />
        <div id="nhat-ky">
          <AuditLog entries={audit.filter((a) => (a.targetType ?? "program") === "program").slice(0, 30)} names={names} />
        </div>
      </AdminBody>
    </>
  );
}
