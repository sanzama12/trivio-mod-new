import type { Metadata } from "next";
import { LuExternalLink, LuShieldCheck, LuTriangleAlert } from "react-icons/lu";
import { KIND_LABELS, outcomeService, TRUST_LABELS } from "@/services/outcome.service";
import { Breadcrumb } from "@/components/ui/misc";
import { Card, SectionHeading } from "@/components/ui/card";
import { SourceChip, TrustBadge } from "@/components/outcomes/source-chip";
import { OutcomeTable } from "@/components/outcomes/outcome-table";

export const metadata: Metadata = { title: "Việc làm & thu nhập theo ngành" };

const vn = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export default async function OutcomesPage() {
  const [rows, benchmarks, sources] = await Promise.all([outcomeService.listMajors(), outcomeService.benchmarks(), outcomeService.listSources()]);
  const tableRows = rows.map(({ major, group, outcome }) => ({
    majorId: major.id,
    slug: major.slug,
    name: major.name,
    groupId: group.id,
    groupName: group.name,
    employment: outcome?.employmentRate ? { value: outcome.employmentRate.metric.value, source: outcome.employmentRate.source, year: outcome.employmentRate.metric.year } : null,
    starting: outcome?.startingSalary
      ? { value: outcome.startingSalary.metric.value, low: outcome.startingSalary.metric.low, high: outcome.startingSalary.metric.high, source: outcome.startingSalary.source, year: outcome.startingSalary.metric.year }
      : null,
    experienced: outcome?.experiencedSalary ? { value: outcome.experiencedSalary.metric.value, source: outcome.experiencedSalary.source, year: outcome.experiencedSalary.metric.year } : null,
  }));
  const groups = Array.from(new Map(rows.map((r) => [r.group.id, r.group.name])).entries());

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Việc làm & thu nhập" }]} />
      <div className="mt-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Việc làm & thu nhập theo ngành</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi con số đều ghi nguồn, năm và mức tin cậy. Số liệu không có nguồn sẽ không được hiển thị.
        </p>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Mốc so sánh chính thức">
        {benchmarks.map((b) => (
          <Card key={b.id} className="p-5">
            <p className="text-[13px] text-slate-500">
              {b.label} ({b.year})
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {vn(b.value)} <span className="text-sm font-semibold text-slate-500">{b.unit}</span>
            </p>
            <div className="mt-2">
              <SourceChip source={b.source} year={b.year} />
            </div>
          </Card>
        ))}
      </section>

      <p className="mt-6 flex items-start gap-2 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
        <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Số liệu theo ngành trong bản demo đang là <strong>minh hoạ</strong> (nhãn cam). Khi triển khai thật, quản trị viên thay bằng tỷ lệ việc làm do từng trường công khai theo Thông tư 09/2024/TT-BGDĐT
          hoặc khảo sát có phương pháp rõ ràng — giao diện tự đổi nhãn theo mức tin cậy của nguồn.
        </span>
      </p>

      <OutcomeTable rows={tableRows} groups={groups} />

      <section className="mt-12" id="nguon-du-lieu">
        <SectionHeading title="Nguồn dữ liệu & cách đọc số liệu" subtitle="Mức tin cậy được suy ra từ loại nguồn, không do người nhập tự chọn." />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {(Object.keys(TRUST_LABELS) as (keyof typeof TRUST_LABELS)[]).map((t) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-4">
              <TrustBadge trust={t} />
              <p className="mt-2 text-[13px] text-slate-600">
                {t === "cao" && "Văn bản pháp luật, thống kê nhà nước."}
                {t === "trung-binh" && "Khảo sát việc làm do trường tự thực hiện, báo chí dẫn khảo sát — nên đối chiếu báo cáo gốc."}
                {t === "tham-khao" && "Khảo sát doanh nghiệp / trang tuyển dụng: mẫu không đại diện toàn bộ sinh viên."}
                {t === "minh-hoa" && "Số liệu dựng giao diện của bản demo, không dùng để ra quyết định."}
              </p>
            </div>
          ))}
        </div>
        <ul className="mt-6 space-y-3">
          {sources.map((s) => (
            <li key={s.id} id={`nguon-${s.id}`} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <TrustBadge trust={s.trust} />
                <span className="text-xs text-slate-500">{KIND_LABELS[s.kind]}</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{s.title}</p>
              <p className="text-[13px] text-slate-600">
                {s.publisher} · {s.year} · truy cập {s.accessedAt.split("-").reverse().join("/")}
              </p>
              <p className="mt-2 text-sm text-slate-600">{s.note}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600 hover:underline">
                  Xem nguồn gốc <LuExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-[13px] text-slate-600">
          <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
          <p>
            Lưu ý khi đọc: “có việc làm” thường gồm cả tự tạo việc làm và học tiếp; mỗi trường khảo sát với tỷ lệ phản hồi khác nhau. Lương khởi điểm dao động theo địa phương và
            năng lực cá nhân. Hãy xem số liệu như mốc tham khảo, không phải cam kết.
          </p>
        </div>
      </section>
    </div>
  );
}
