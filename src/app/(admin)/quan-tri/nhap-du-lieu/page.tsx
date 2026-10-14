import type { Metadata } from "next";
import { LuDownload, LuFileSpreadsheet } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { importService } from "@/services/import.service";
import { unifiedEntryService } from "@/services/unified-entry.service";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, fmtDate, Panel } from "@/components/admin/ui";
import { UnifiedEntryHub } from "@/components/admin/unified-entry-hub";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nhập liệu Tuyển sinh Tích hợp (Trường · Ngành · Điểm · Học phí)",
  robots: { index: false, follow: false },
};

export default async function AdminImportPage() {
  const user = await adminPage("/quan-tri/nhap-du-lieu");
  const [history, options, unifiedRows] = await Promise.all([
    importService.history(10),
    unifiedEntryService.getFormOptions(),
    unifiedEntryService.listAll(),
  ]);
  const { schools, majors } = options;

  return (
    <>
      <AdminHeader
        title="Nhập liệu Tuyển sinh Tích hợp (Trường · Ngành · Điểm · Học phí)"
        crumb="Nhập liệu tuyển sinh"
        updatedAt={history[0]?.at ?? null}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/import?type=simple"
              download
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <LuDownload className="size-4" aria-hidden /> Tải mẫu Excel siêu dễ
            </a>
          </div>
        }
      />
      <AdminBody>
        <UnifiedEntryHub
          userName={user.name}
          schools={schools}
          majors={majors}
          initialRows={unifiedRows}
        />

        {history.length > 0 && (
          <Panel className="p-5 sm:p-6" aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-base font-bold text-slate-900">
              Lịch sử các đợt nạp tệp gần đây
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {history.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="font-semibold text-slate-900">{b.fileName}</span>
                  <span className="text-slate-500">
                    {b.byName} · {fmtDate(b.at)}
                  </span>
                  <span className="ml-auto text-slate-700">
                    <b className="text-success-700">{b.created}</b> mới · <b className="text-primary-700">{b.updated}</b> cập nhật · {b.errors} dòng lỗi bỏ qua
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </AdminBody>
    </>
  );
}
