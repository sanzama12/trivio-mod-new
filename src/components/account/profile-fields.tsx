"use client";

import { LuGraduationCap, LuSchool, LuUsers } from "react-icons/lu";
import { gradYearOptions, PROVINCES } from "@/domain/provinces";
import type { UserRole } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Checkbox, Label } from "@/components/ui/field";

export interface ProfileFormValue {
  role: UserRole | null;
  gradYear: number | null;
  province: string | null;
  under16: boolean;
  parentConsent: boolean;
}

const selectClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none";

/** Các trường hồ sơ tuỳ chọn, dùng chung cho onboarding và trang hồ sơ. */
export function ProfileFields({ value, onChange, error }: { value: ProfileFormValue; onChange: (v: ProfileFormValue) => void; error?: string | null }) {
  const set = <K extends keyof ProfileFormValue>(k: K, v: ProfileFormValue[K]) => onChange({ ...value, [k]: v });
  const isParent = value.role === "parent";
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Bạn là</legend>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(
            [
              ["student", "Học sinh", LuGraduationCap],
              ["parent", "Phụ huynh", LuUsers],
              ["teacher", "Giáo viên", LuSchool],
            ] as const
          ).map(([k, label, Icon]) => (
            <label
              key={k}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center text-sm font-semibold transition-colors sm:flex-row sm:gap-3 sm:p-3.5 sm:text-left",
                value.role === k ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-700 hover:border-primary-200",
              )}
            >
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={value.role === k}
                onChange={() => onChange({ ...value, role: k, ...(k !== "student" ? { under16: false, parentConsent: false } : {}) })}
              />
              <Icon className="size-5" aria-hidden /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pf-grad">{isParent ? "Con bạn tốt nghiệp THPT năm" : "Năm tốt nghiệp THPT"}</Label>
          <select id="pf-grad" className={selectClass} value={value.gradYear ?? ""} onChange={(e) => set("gradYear", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Chưa chọn</option>
            {Array.from(new Set([...gradYearOptions(), ...(value.gradYear ? [value.gradYear] : [])]))
              .sort()
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-province">Tỉnh/thành đang học</Label>
          <select id="pf-province" className={selectClass} value={value.province ?? ""} onChange={(e) => set("province", e.target.value || null)}>
            <option value="">Chưa chọn</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Dùng để ưu tiên gợi ý trường gần bạn.</p>
        </div>
      </div>

      {value.role !== "parent" && value.role !== "teacher" && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <Checkbox label="Tôi dưới 16 tuổi" checked={value.under16} onChange={(e) => onChange({ ...value, under16: e.target.checked, parentConsent: e.target.checked ? value.parentConsent : false })} />
          {value.under16 && (
            <Checkbox
              label={
                <>
                  Cha mẹ hoặc người giám hộ của tôi đã đồng ý cho tôi sử dụng Trovio.{" "}
                  <span className="text-slate-500">(Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân của trẻ em.)</span>
                </>
              }
              checked={value.parentConsent}
              onChange={(e) => set("parentConsent", e.target.checked)}
            />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
