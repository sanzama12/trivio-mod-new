import Link from "next/link";
import { LuArrowRight, LuMapPin } from "react-icons/lu";
import type { ProgramView } from "@/services/program.service";
import { formatTuition } from "@/lib/format";
import { ADMISSION_METHODS, formatMethodScore } from "@/services/scoring.service";
import { EstimatedTag } from "@/components/ui/estimated-tag";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { CompareButton, SaveButton } from "./program-actions";
import { FitBadge } from "./fit-badge";

export function SchoolCode({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  return (
    <span
      className={
        size === "lg"
          ? "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-primary-700 shadow-sm"
          : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-[13px] font-extrabold text-primary-700"
      }
    >
      {code}
    </span>
  );
}

export function ProgramCard({ view }: { view: ProgramView }) {
  const { program, school, latestCutoff, fit, cutoffMethod = "thpt", cutoffEstimated } = view;
  const methodTag = cutoffMethod !== "thpt" ? ` ${ADMISSION_METHODS[cutoffMethod].short}` : "";
  return (
    <Card className="p-5 transition-shadow hover:shadow-elevated">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <SchoolCode code={school.code} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-bold text-slate-900">
              <Link href={`/chuong-trinh/${program.slug}`} className="hover:text-primary-700">
                {program.name}
              </Link>
            </h3>
            {program.trainingType !== "Chính quy" && <span className="text-xs font-medium text-slate-500">· {program.trainingType}</span>}
          </div>
          <Link href={`/truong/${school.slug}`} className="mt-1 inline-block text-sm font-semibold text-primary-600 hover:underline">
            {school.name}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
            <LuMapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{program.campus}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-md bg-primary-600 px-2 py-1 font-bold text-white">
              {latestCutoff != null ? `${formatMethodScore(latestCutoff, cutoffMethod)} điểm${methodTag}` : "Chưa có dữ liệu chính thức"}
            </span>
            {cutoffEstimated && <EstimatedTag />}
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">{formatTuition(program.tuitionMin, program.tuitionMax)}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">{program.durationYears} năm</span>
            {program.combos.length > 0 && <span className="text-slate-500">Tổ hợp: {program.combos.join(", ")}</span>}
          </div>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2 sm:w-44 sm:flex-col sm:items-stretch">
          <div className="flex items-center justify-between gap-2 sm:mb-1">
            <FitBadge fit={fit} />
            <SaveButton id={program.id} />
          </div>
          <CompareButton id={program.id} />
          <Link href={`/chuong-trinh/${program.slug}`} className={buttonClass({ size: "sm" })}>
            Xem chi tiết <LuArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Card>
  );
}
