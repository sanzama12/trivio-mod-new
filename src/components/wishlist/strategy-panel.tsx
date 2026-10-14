"use client";

import { useState } from "react";
import { LuArrowDownUp, LuCircleAlert, LuCircleCheck, LuInfo, LuShieldCheck, LuTriangleAlert } from "react-icons/lu";
import type { StoredProfile } from "@/domain/types";
import { analyzeWishlist, type CheckLevel, type StrategyItem } from "@/services/wishlist-strategy";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const STYLE: Record<CheckLevel, { box: string; icon: typeof LuInfo; iconClass: string }> = {
  danger: { box: "border-danger-100 bg-danger-50", icon: LuCircleAlert, iconClass: "text-danger-500" },
  warning: { box: "border-accent-200 bg-accent-50", icon: LuTriangleAlert, iconClass: "text-accent-500" },
  info: { box: "border-primary-200 bg-primary-50", icon: LuInfo, iconClass: "text-primary-600" },
  ok: { box: "border-success-100 bg-success-50", icon: LuCircleCheck, iconClass: "text-success-500" },
};

const SUMMARY: Record<CheckLevel | "incomplete", string> = {
  danger: "Có vấn đề cần sửa trước khi đăng ký",
  warning: "Nên xem lại vài điểm",
  info: "Danh sách ổn, có vài gợi ý nhỏ",
  ok: "Danh sách hợp lý",
  incomplete: "Cần nhập điểm để kiểm tra đầy đủ",
};

/** "Kiểm tra danh sách của tôi" — rà thứ tự, mức an toàn, tổ hợp/phương thức, ngân sách. */
export function StrategyPanel({
  items,
  profile,
  onReorder,
}: {
  items: StrategyItem[];
  profile: StoredProfile | null;
  onReorder: (ids: string[]) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const report = analyzeWishlist(items, profile);
  const issues = report.checks.filter((c) => c.level === "danger" || c.level === "warning").length;

  return (
    <section aria-labelledby="strategy-title" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:p-5" data-print-hide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <LuShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="strategy-title" className="font-bold text-slate-900">
              Kiểm tra chiến lược nguyện vọng
            </h2>
            <p className="text-[13px] text-slate-500">
              {open ? SUMMARY[report.status] : "Rà thứ tự, mức an toàn, tổ hợp và học phí trước khi đăng ký chính thức."}
            </p>
          </div>
        </div>
        <Button variant={open ? "outline" : "primary"} size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="strategy-body">
          {open ? "Thu gọn" : issues > 0 ? `Kiểm tra danh sách của tôi (${issues})` : "Kiểm tra danh sách của tôi"}
        </Button>
      </div>

      {open && (
        <div id="strategy-body" className="mt-4 space-y-3" aria-live="polite">
          {report.status !== "incomplete" && (
            <div className="flex flex-wrap gap-2 text-[13px]">
              {(
                [
                  ["thu-suc", "Thử sức", "bg-accent-50 text-accent-700"],
                  ["vua-suc", "Vừa sức", "bg-primary-50 text-primary-700"],
                  ["an-toan", "An toàn", "bg-success-50 text-success-700"],
                  ["unknown", "Không xét được", "bg-slate-100 text-slate-600"],
                ] as const
              )
                .filter(([k]) => k !== "unknown" || report.counts.unknown > 0)
                .map(([k, label, cls]) => (
                  <span key={k} className={cn("rounded-full px-3 py-1 font-semibold", cls)}>
                    {label}: {report.counts[k]}
                  </span>
                ))}
            </div>
          )}
          <ul className="space-y-2">
            {report.checks.map((c) => {
              const st = STYLE[c.level];
              return (
                <li key={c.id} className={cn("flex gap-3 rounded-xl border p-3.5", st.box)}>
                  <st.icon className={cn("mt-0.5 size-5 shrink-0", st.iconClass)} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{c.detail}</p>
                    {c.id === "order" && report.suggestedOrder && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2.5 bg-white"
                        onClick={() => {
                          onReorder(report.suggestedOrder!);
                          toast("Đã sắp xếp lại: Thử sức → Vừa sức → An toàn", "success");
                        }}
                      >
                        <LuArrowDownUp className="size-4" aria-hidden /> Sắp xếp lại theo gợi ý
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500">
            Đánh giá dựa trên điểm chuẩn năm gần nhất (dữ liệu minh hoạ), chỉ mang tính tham khảo. Mỗi thí sinh chỉ trúng tuyển nguyện vọng có thứ tự cao nhất mà mình đủ điều kiện.
          </p>
        </div>
      )}
    </section>
  );
}
