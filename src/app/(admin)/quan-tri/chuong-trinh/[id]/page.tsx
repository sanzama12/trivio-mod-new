import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/admin-page";
import { adminService } from "@/services";
import { formatMonthVi } from "@/lib/format";
import { ProgramEditor } from "@/components/admin/program-editor";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { ProgramVisibility } from "@/components/admin/catalog-actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Sửa dữ liệu chương trình", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function AdminProgramPage({ params }: Props) {
  const { id } = await params;
  await adminPage(`/quan-tri/chuong-trinh/${id}`);
  const data = await adminService.getProgram(id);
  if (!data) notFound();
  const { view, edited } = data;
  const p = view.program;
  const audit = (await adminService.listAudit(200)).filter((a) => a.programId === id).slice(0, 10);

  return (
    <>
      <AdminHeader title={p.name} crumb="Chương trình đào tạo" />
      <AdminBody>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-slate-500">
            {view.school.name} · Mã {p.admissionCode} · Cập nhật {formatMonthVi(p.updatedAt)}
            {edited && <span className="ml-2 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">Đã chỉnh so với dữ liệu gốc</span>}
            {p.hidden && (
              <Badge tone="slate" className="ml-2">
                Tạm ẩn
              </Badge>
            )}
          </p>
          <div className="flex items-center gap-4">
            <ProgramVisibility id={p.id} hidden={!!p.hidden} />
            {!p.hidden && (
              <Link href={`/chuong-trinh/${p.slug}`} className="text-sm font-semibold text-primary-600 hover:underline">
                Xem trang công khai →
              </Link>
            )}
          </div>
        </div>
        <ProgramEditor
          id={p.id}
          edited={edited}
          initial={{ cutoffs: p.cutoffs, altCutoffs: p.altCutoffs, tuitionMin: p.tuitionMin, tuitionMax: p.tuitionMax, quota: p.quota, source: p.source, schoolVerifiedAt: p.schoolVerifiedAt ?? null, schoolVerifiedNote: p.schoolVerifiedNote ?? null }}
          history={audit}
        />
      </AdminBody>
    </>
  );
}
