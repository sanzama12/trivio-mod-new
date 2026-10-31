"use client";

import { useState } from "react";
import { LuBuilding2, LuGraduationCap } from "react-icons/lu";
import type { School } from "@/domain/types";
import { SchoolCompareView } from "@/components/school/school-compare-view";
import { CompareView } from "@/components/program/compare-view";
import { cn } from "@/lib/cn";

export interface CompareTabsClientProps {
  schools: School[];
  initialTab?: "truong" | "chuong-trinh";
}

export function CompareTabsClient({
  schools,
  initialTab = "truong",
}: CompareTabsClientProps) {
  const [tab, setTab] = useState<"truong" | "chuong-trinh">(initialTab);

  return (
    <div className="space-y-6">
      {/* Chuyển đổi tab: So sánh trường vs So sánh chương trình */}
      <div className="flex border-b border-stone-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("truong")}
            className={cn(
              "flex items-center gap-2.5 border-b-2 px-5 py-3.5 text-sm font-bold transition-all",
              tab === "truong"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
            )}
          >
            <LuBuilding2 className="size-4.5 text-primary-600" />
            <span>So sánh trường đại học (2–4 trường)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("chuong-trinh")}
            className={cn(
              "flex items-center gap-2.5 border-b-2 px-5 py-3.5 text-sm font-bold transition-all",
              tab === "chuong-trinh"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
            )}
          >
            <LuGraduationCap className="size-4.5 text-accent-600" />
            <span>So sánh chương trình đào tạo</span>
          </button>
        </div>
      </div>

      {/* Nội dung theo tab được chọn */}
      {tab === "truong" ? (
        <SchoolCompareView initialSchools={schools} />
      ) : (
        <CompareView />
      )}
    </div>
  );
}
