import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { schoolPortalService } from "@/services/school-portal.service";
import { Breadcrumb } from "@/components/ui/misc";
import { SchoolPortal, SchoolPortalJoin } from "@/components/school/school-portal";

export const metadata: Metadata = { title: "Cổng trường – xác nhận số liệu tuyển sinh", robots: { index: false, follow: false } };

export default async function SchoolPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/cong-truong");
  const data = await schoolPortalService.dashboard(user);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Cổng trường" }]} />
      {data ? (
        <SchoolPortal
          email={user.email}
          school={{ name: data.school.name, shortName: data.school.shortName, code: data.school.code }}
          done={data.done}
          total={data.total}
          items={data.items.map((i) => ({ ...i, fields: i.fields.map((f) => ({ ...f, pending: f.pending ? { proposed: f.pending.proposed, createdAt: f.pending.createdAt } : null })) }))}
          history={data.submissions.filter((s) => s.status !== "pending").slice(0, 10).map((s) => ({ id: s.id, programId: s.programId, field: s.field, proposed: s.proposed, status: s.status, adminNote: s.adminNote, resolvedAt: s.resolvedAt }))}
        />
      ) : (
        <SchoolPortalJoin
          verified={user.verified}
          email={user.email}
          status={user.schoolStaff?.status ?? null}
          schools={(await schoolPortalService.matchSchools(user)).map((s) => ({ id: s.id, name: s.name, code: s.code }))}
        />
      )}
    </div>
  );
}
