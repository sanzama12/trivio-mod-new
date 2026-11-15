"use client";

import { useState } from "react";
import { LuBuilding2, LuGraduationCap } from "react-icons/lu";
import type { School } from "@/domain/types";
import { SchoolCompareView } from "@/components/school/school-compare-view";
import { CompareView } from "@/components/program/compare-view";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";

export interface CompareTabsClientProps {
  schools: School[];
  initialTab?: "truong" | "chuong-trinh";
}

export function CompareTabsClient({
  schools,
  initialTab = "chuong-trinh",
}: CompareTabsClientProps) {
  const [tab, setTab] = useState<"truong" | "chuong-trinh">(initialTab);
  const { compare, hydrated } = useTrovio();
  const count = hydrated ? compare.length : 0;

  return (
    <div className="space-y-6">
      {/* Chuyển đổi tab: Ưu tiên So sánh chương trình đã chọn ở ngoài */}
      <div className="flex border-b border-slate-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("chuong-trinh")}
            className={cn(
              "flex items-center gap-2.5 border-b-2 px-5 py-3.5 text-sm font-semibold transition-all cursor-pointer",
              tab === "chuong-trinh"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            <LuGraduationCap className="size-4.5 text-teal-700" />
            <span>So sánh chương trình đào tạo</span>
            {count > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-teal-800 text-[11px] font-black text-white">
                {count}
              </span>
            ) : (
              <span className="text-xs font-normal text-slate-400">
                (Đang chọn 0/{MAX_COMPARE})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("truong")}
            className={cn(
              "flex items-center gap-2.5 border-b-2 px-5 py-3.5 text-sm font-semibold transition-all cursor-pointer",
              tab === "truong"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            <LuBuilding2 className="size-4.5 text-slate-500" />
            <span>So sánh tổng quan trường</span>
          </button>
        </div>
      </div>

      {/* Nội dung theo tab được chọn */}
      {tab === "chuong-trinh" ? (
        <CompareView />
      ) : (
        <SchoolCompareView initialSchools={schools} />
      )}
    </div>
  );
}
