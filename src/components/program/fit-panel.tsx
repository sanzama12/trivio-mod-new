"use client";

import Link from "next/link";
import { LuCalculator } from "react-icons/lu";
import type { Program } from "@/domain/types";
import {
  ADMISSION_METHODS,
  cutoffFor,
  fitForProfile,
  formatMethodScore,
  METHOD_KEYS,
  pointsToSafe,
  profileScore,
} from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { EstimatedTag } from "@/components/ui/estimated-tag";

/** Khả năng trúng tuyển dựa trên hồ sơ điểm đã lưu (S07), theo phương thức của hồ sơ. */
export function FitPanel({ program }: { program: Pick<Program, "cutoffs" | "altCutoffs" | "combos"> }) {
  const { profile, hydrated } = useTrovio();
  if (!hydrated) return <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />;

  const accepted = METHOD_KEYS.filter((k) => cutoffFor(program, k));
  if (accepted.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-card">
        Chương trình không có điểm chuẩn theo điểm thi, học bạ hay ĐGNL. Xem điều kiện học bạ / chứng chỉ ở mục Tuyển sinh.
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-primary-800">
          <LuCalculator className="size-4" aria-hidden /> Bạn có khả năng đỗ không?
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-primary-900/80">
          Nhập điểm ({accepted.map((k) => ADMISSION_METHODS[k].short).join(", ")}) và khu vực ưu tiên để so với điểm chuẩn gần nhất.
        </p>
        <Link href="/diem-cua-toi" className={buttonClass({ size: "sm", className: "mt-4" })}>
          Nhập điểm của tôi
        </Link>
      </div>
    );
  }

  const { method, total } = profileScore(profile);
  const cfg = ADMISSION_METHODS[method];
  const { fit, reason } = fitForProfile(profile, program);
  const tone = !fit ? "slate" : fit.level === "an-toan" ? "success" : fit.level === "vua-suc" ? "primary" : "accent";
  const need = fit && fit.level !== "an-toan" ? pointsToSafe(total, program, method) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        tone === "success" && "border-success-100 bg-success-50",
        tone === "primary" && "border-primary-200 bg-primary-50",
        tone === "accent" && "border-accent-200 bg-accent-50",
        tone === "slate" && "border-slate-200 bg-white",
      )}
    >
      <p className="text-xs font-semibold text-slate-500 uppercase">
        Điểm của bạn ({cfg.short}
        {cfg.needsCombo ? ` · ${profile.combo}` : ""})
      </p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatMethodScore(total, method)}</p>
      {fit ? (
        <>
          <p
            className={cn(
              "mt-2 text-sm font-bold",
              tone === "success" && "text-success-700",
              tone === "primary" && "text-primary-700",
              tone === "accent" && "text-accent-700",
            )}
          >
            {fit.label}
          </p>
          <p className="mt-1 text-[13px] text-slate-600">{fit.hint}</p>
          {cutoffFor(program, method)?.estimated && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] text-accent-700">
              <EstimatedTag className="shrink-0" /> Mức phù hợp tính theo điểm chuẩn ước tính — chỉ để tham khảo, hãy đối chiếu đề án của trường.
            </p>
          )}
          {need != null && need > 0 && (
            <p className="mt-1 text-[13px] text-slate-600">
              Cần thêm khoảng <strong>{formatMethodScore(need, method)}</strong> điểm để ở mức An toàn.
            </p>
          )}
        </>
      ) : reason === "combo" ? (
        <p className="mt-2 text-[13px] text-slate-600">
          Chương trình không xét tổ hợp {profile.combo}. Tổ hợp được xét: {program.combos.join(", ") || "—"}.
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-slate-600">
          Chương trình không xét {cfg.short}. Phương thức có điểm chuẩn: {accepted.map((k) => ADMISSION_METHODS[k].short).join(", ")}.
        </p>
      )}
      <Link href="/diem-cua-toi" className="mt-3 inline-block text-[13px] font-semibold text-primary-600 hover:underline">
        Cập nhật điểm
      </Link>
    </div>
  );
}
