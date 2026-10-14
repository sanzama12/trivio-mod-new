import type { Metadata } from "next";
import { LuLandmark, LuLayoutGrid, LuShieldCheck, LuTriangleAlert } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { catalogAdminService } from "@/services/catalog-admin.service";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, StatGrid } from "@/components/admin/ui";
import { SchoolManager } from "@/components/admin/school-manager";

export const metadata: Metadata = { title: "Quản lý Trường & Cơ sở", robots: { index: false, follow: false } };

export default async function AdminSchoolsPage() {
  await adminPage("/quan-tri/truong");
  const rows = await catalogAdminService.schools();
  const live = rows.filter((r) => !r.school.hidden);
  return (
    <>
      <AdminHeader title="Quản lý Trường & Cơ sở" crumb="Trường & Cơ sở" />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng số trường" value={live.length} hint={`${rows.filter((r) => r.school.custom).length} trường do quản trị viên thêm`} hintTone="success" Icon={LuLandmark} />
          <AdminStat label="Cơ sở đào tạo" value={live.reduce((n, r) => n + r.campuses, 0)} Icon={LuLayoutGrid} />
          <AdminStat label="Công lập" value={live.filter((r) => r.school.type === "cong-lap").length} Icon={LuShieldCheck} tone="success" />
          <AdminStat label="Tư thục / Quốc tế" value={live.filter((r) => r.school.type !== "cong-lap").length} Icon={LuTriangleAlert} tone="accent" />
        </StatGrid>
        <SchoolManager
          rows={rows.map((r) => ({
            id: r.school.id,
            code: r.school.code,
            name: r.school.name,
            shortName: r.school.shortName,
            type: r.school.type,
            city: r.school.city,
            region: r.school.region,
            website: r.school.website,
            description: r.school.description,
            campuses: r.campuses,
            majors: r.majors,
            programs: r.programs,
            hidden: !!r.school.hidden,
            custom: !!r.school.custom,
            slug: r.school.slug,
          }))}
        />
      </AdminBody>
    </>
  );
}
