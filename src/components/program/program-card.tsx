import Link from "next/link";
import { LuArrowRight, LuMapPin } from "react-icons/lu";
import type { ProgramView } from "@/services/program.service";
import { formatTuition } from "@/lib/format";
import { ADMISSION_METHODS, formatMethodScore } from "@/services/scoring.service";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { CompareButton, SaveButton } from "./program-actions";
import { FitBadge } from "./fit-badge";
import { SchoolLogo } from "@/components/school/school-logo";

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
  const { program, school, latestCutoff, fit, cutoffMethod = "thpt" } = view;
  const methodTag = cutoffMethod !== "thpt" ? ` ${ADMISSION_METHODS[cutoffMethod].short}` : "";
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-[#fcfdfd] p-0 shadow-[0_8px_24px_rgba(15,118,110,0.07)] transition-shadow hover:shadow-[0_12px_30px_rgba(15,118,110,0.12)]">
      <div className="border-l-4 border-primary-600 p-4 md:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
        <SchoolLogo school={school} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] leading-snug font-extrabold tracking-tight text-slate-950">
              <Link href={`/chuong-trinh/${program.slug}`} className="hover:text-primary-700">
                {program.name}
              </Link>
            </h3>
            {program.trainingType !== "Chính quy" && <span className="text-xs font-medium text-slate-500">· {program.trainingType}</span>}
          </div>
          <Link href={`/truong/${school.slug}`} className="mt-1 inline-block text-sm font-bold text-primary-700 hover:text-primary-800 hover:underline">
            {school.name}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
            <LuMapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{program.campus}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-lg bg-primary-700 px-2.5 py-1.5 text-[13px] font-extrabold text-white shadow-sm">
              {latestCutoff != null ? `${formatMethodScore(latestCutoff, cutoffMethod)} điểm${methodTag}` : "Chưa có dữ liệu chính thức"}
            </span>
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
      </div>
    </Card>
  );
}
