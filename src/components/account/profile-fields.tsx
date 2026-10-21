"use client";

import { gradYearOptions, PROVINCES } from "@/domain/provinces";
import { Checkbox, Label } from "@/components/ui/field";

export interface ProfileFormValue {
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
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pf-grad">Năm tốt nghiệp THPT</Label>
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

      {(
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
