import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { adminService } from "@/services";
import { outcomeService } from "@/services/outcome.service";
import { AuditLog } from "@/components/admin/audit-log";
import { OutcomeEditor } from "@/components/admin/outcome-editor";

export const metadata: Metadata = { title: "Quản trị việc làm & thu nhập", robots: { index: false, follow: false } };

export default async function AdminOutcomesPage() {
  await adminPage("/quan-tri/viec-lam");
  const [rows, sources, audit] = await Promise.all([outcomeService.listMajors(), outcomeService.listSources(), adminService.listAudit(200)]);
  const majors = rows.map(({ major, outcome }) => ({
    id: major.id,
    name: major.name,
    employmentRate: outcome?.employmentRate?.metric ?? null,
    startingSalary: outcome?.startingSalary?.metric ?? null,
    experiencedSalary: outcome?.experiencedSalary?.metric ?? null,
    demoOnly: outcome?.demoOnly ?? false,
    updatedAt: outcome?.updatedAt ?? null,
  }));
  const names = Object.fromEntries([...rows.map((r) => [r.major.id, r.major.name]), ...sources.map((s) => [s.id, s.title])]);
  return (
    <>
      <AdminHeader title="Việc làm & thu nhập theo ngành" crumb="Việc làm & thu nhập" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Mỗi con số phải chọn một nguồn. Nguồn mới cần đường dẫn https tới văn bản/báo cáo gốc; mức tin cậy được suy ra từ loại nguồn.
      </p>
      <OutcomeEditor majors={majors} sources={sources.map((s) => ({ id: s.id, label: `${s.title} — ${s.publisher} (${s.year})`, trust: s.trust }))} />
      <AuditLog entries={audit.filter((a) => a.targetType === "major-outcome" || a.targetType === "source").slice(0, 30)} names={names} />
      </AdminBody>
    </>
  );
}
