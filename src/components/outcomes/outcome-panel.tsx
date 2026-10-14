import Link from "next/link";
import type { ReactNode } from "react";
import { LuBriefcase, LuTriangleAlert, LuWallet } from "react-icons/lu";
import type { Benchmark, DataSource } from "@/domain/types";
import type { MajorOutcomeView, MetricView } from "@/services/outcome.service";
import { Card } from "@/components/ui/card";
import { SourceChip } from "./source-chip";

const vn = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function Metric({ label, m, unit, icon }: { label: string; m: MetricView | null; unit: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
        {icon} {label}
      </p>
      {m ? (
        <>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {vn(m.metric.value)}
            <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>
          </p>
          {m.metric.low !== undefined && m.metric.high !== undefined && (
            <p className="text-[13px] text-slate-600">
              Khoảng phổ biến {vn(m.metric.low)}–{vn(m.metric.high)} {unit}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SourceChip source={m.source} year={m.metric.year} />
            {m.stale && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700">
                <LuTriangleAlert className="size-3" aria-hidden /> Số liệu cũ
              </span>
            )}
          </div>
          {m.metric.note && <p className="mt-1.5 text-xs text-slate-500">{m.metric.note}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Chưa có số liệu có nguồn.</p>
      )}
    </div>
  );
}

/** Việc làm & thu nhập của một ngành — mỗi con số kèm nguồn và mức tin cậy. */
export function OutcomePanel({
  outcome,
  income,
}: {
  outcome: MajorOutcomeView | null;
  income?: (Benchmark & { source: DataSource }) | null;
}) {
  return (
    <Card id="viec-lam" className="scroll-mt-24 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Việc làm & thu nhập</h2>
        <Link href="/viec-lam" className="text-sm font-semibold text-primary-600 hover:underline">
          So sánh các ngành →
        </Link>
      </div>
      {outcome?.demoOnly && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-accent-200 bg-accent-50 p-3 text-[13px] text-accent-700">
          <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Số liệu của ngành này hiện là minh hoạ, chưa phải thống kê thật. Tham khảo báo cáo khảo sát việc làm do từng trường công khai.
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Có việc làm trong 12 tháng" m={outcome?.employmentRate ?? null} unit="%" icon={<LuBriefcase className="size-4" aria-hidden />} />
        <Metric label="Lương khởi điểm (trung vị)" m={outcome?.startingSalary ?? null} unit="triệu/tháng" icon={<LuWallet className="size-4" aria-hidden />} />
        <Metric label="Thu nhập sau 3–5 năm" m={outcome?.experiencedSalary ?? null} unit="triệu/tháng" icon={<LuWallet className="size-4" aria-hidden />} />
      </div>
      {income && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
          Mốc so sánh: {income.label.toLowerCase()} năm {income.year} là <strong>{vn(income.value)} {income.unit}</strong>
          <SourceChip source={income.source} year={income.year} />
        </p>
      )}
    </Card>
  );
}
