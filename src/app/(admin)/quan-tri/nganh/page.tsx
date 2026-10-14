import type { Metadata } from "next";
import { LuClock, LuFolderOpen, LuLayoutGrid, LuShieldCheck } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { catalogAdminService } from "@/services/catalog-admin.service";
import { repositories } from "@/repositories";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, StatGrid } from "@/components/admin/ui";
import { MajorManager } from "@/components/admin/major-manager";

export const metadata: Metadata = { title: "Quản lý Danh mục ngành", robots: { index: false, follow: false } };

export default async function AdminMajorsPage() {
  await adminPage("/quan-tri/nganh");
  const [rows, groups] = await Promise.all([catalogAdminService.majors(), repositories.majors.findGroups()]);
  return (
    <>
      <AdminHeader title="Quản lý Danh mục ngành" crumb="Ngành đào tạo" />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng ngành" value={rows.length} hint={`${rows.filter((r) => r.major.custom).length} ngành do quản trị viên thêm`} hintTone="success" Icon={LuFolderOpen} />
          <AdminStat label="Nhóm ngành" value={groups.length} Icon={LuLayoutGrid} />
          <AdminStat label="Đã duyệt" value={rows.filter((r) => !r.major.hidden).length} Icon={LuShieldCheck} tone="success" />
          <AdminStat label="Chờ duyệt" value={rows.filter((r) => r.major.hidden).length} Icon={LuClock} tone="accent" />
        </StatGrid>
        <MajorManager
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          rows={rows.map((r) => ({
            id: r.major.id,
            slug: r.major.slug,
            code: r.major.code,
            name: r.major.name,
            groupId: r.major.groupId,
            groupName: r.groupName,
            riasec: r.major.riasec,
            summary: r.major.summary,
            programs: r.programs,
            hidden: !!r.major.hidden,
          }))}
        />
      </AdminBody>
    </>
  );
}
