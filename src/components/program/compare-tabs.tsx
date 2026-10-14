"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuPrinter } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { CompareView } from "./compare-view";
import { DecisionMatrix } from "./decision-matrix";

/** Hai tab của trang So sánh: bảng so sánh & ma trận quyết định có trọng số. */
export function CompareTabs({ initial }: { initial: "table" | "matrix" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initial);
  const go = (t: "table" | "matrix") => {
    setTab(t);
    router.replace(t === "matrix" ? "/so-sanh?tab=ma-tran" : "/so-sanh", { scroll: false });
  };
  return (
    <>
      <div className="mt-4 flex gap-1" role="tablist" aria-label="Chế độ so sánh" data-print-hide>
        {(
          [
            ["table", "Bảng so sánh"],
            ["matrix", "Ma trận quyết định"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => go(k)}
            className={cn("relative px-3 py-2 text-sm", tab === k ? "font-semibold text-primary-700" : "font-medium text-slate-600 hover:text-primary-700")}
          >
            {label}
            {tab === k && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary-600" />}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{tab === "matrix" ? "Ma trận quyết định" : "So sánh chương trình đào tạo"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tab === "matrix"
              ? "Chấm các lựa chọn theo điều bạn coi trọng. Kéo trọng số — xếp hạng đổi ngay, mỗi chương trình có điểm thành phần."
              : "So sánh trực quan các chương trình bạn đang quan tâm để đưa ra quyết định tốt nhất."}
          </p>
        </div>
        {tab === "matrix" && (
          <button type="button" onClick={() => window.print()} className={buttonClass({ variant: "outline", size: "sm" })} data-print-hide>
            <LuPrinter className="size-4" aria-hidden /> Tải PDF để bàn với gia đình
          </button>
        )}
      </div>
      <div className="mt-6">{tab === "matrix" ? <DecisionMatrix /> : <CompareView />}</div>
    </>
  );
}
