import type { Metadata } from "next";
import { LuFileText, LuUpload } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { dataOpsService, LATEST_YEAR } from "@/services/data-ops.service";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { ScoreManager } from "@/components/admin/score-manager";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quản lý Điểm chuẩn & Học phí", robots: { index: false, follow: false } };

export default async function AdminScoresPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await adminPage("/quan-tri/diem-hoc-phi");
  const { q, tab } = await searchParams;
  const rows = await dataOpsService.scoreRows();
  return (
    <>
      <AdminHeader
        title="Quản lý Điểm chuẩn & Học phí"
        crumb="Điểm & Học phí"
        actions={
          <>
            <a href="/api/admin/scores" className={buttonClass({ variant: "outline", size: "sm" })} download>
              <LuFileText className="size-4" aria-hidden /> Xuất Excel
            </a>
            <a href="/quan-tri/nhap-du-lieu" className={buttonClass({ variant: "primary", size: "sm" })}>
              <LuUpload className="size-4" aria-hidden /> Nhập dữ liệu
            </a>
          </>
        }
      />
      <AdminBody>
        <ScoreManager rows={rows} latestYear={LATEST_YEAR} initialQuery={typeof q === "string" ? q.slice(0, 80) : ""} initialTab={tab === "hoc-phi" ? "tuition" : "scores"} />
      </AdminBody>
    </>
  );
}
