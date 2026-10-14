"use client";

import { useMemo, useState } from "react";
import { LuBuilding2, LuCircleCheck, LuHandCoins, LuInfo } from "react-icons/lu";
import type { AidCondition, FinancialAidConfig } from "@/domain/types";
import { formatMillion } from "@/lib/cost";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { useProgramViews } from "./use-program-views";

/** Tiền học: học bổng, miễn giảm, vay vốn, ký túc xá — gộp vào trang Tính tổng chi phí. */
export function FinancialAid({ config }: { config: FinancialAidConfig | null }) {
  if (!config) return null;
  const { saved, wishlist, hydrated } = useTrovio();
  const ids = useMemo(() => Array.from(new Set([...wishlist.map((w) => w.id), ...saved])).slice(0, 12), [saved, wishlist]);
  const items = useProgramViews(ids, hydrated);
  const [conds, setConds] = useState<AidCondition[]>([]);
  const toggle = (c: AidCondition) => setConds((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  const eligible = config.policies.filter((p) => p.when.some((w) => conds.includes(w)));
  const others = config.policies.filter((p) => !eligible.includes(p));
  const dorm = conds.includes("o-xa");

  const schools = useMemo(() => {
    const seen = new Map<string, NonNullable<typeof items>[number]>();
    for (const v of items ?? []) if (!seen.has(v.school.id)) seen.set(v.school.id, v);
    return [...seen.values()];
  }, [items]);

  return (
    <section id="ho-tro" className="mt-12 scroll-mt-24" aria-labelledby="aid-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="aid-title" className="text-xl font-bold text-slate-900">
            Tài chính cho việc học: học bổng, miễn giảm, vay vốn, ký túc xá
          </h2>
          <p className="mt-1 text-sm text-slate-600">Đánh dấu điều đúng với bạn để xem các hỗ trợ có thể nhận. Trovio không hỏi thu nhập cụ thể và không lưu câu trả lời.</p>
        </div>
        <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700">Mô tả chung · dữ liệu minh hoạ</span>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Điều nào đúng với bạn?</legend>
            <div className="mt-3 space-y-2.5">
              {config.conditions.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={conds.includes(c.key)} onChange={() => toggle(c.key)} className="mt-0.5 size-4 accent-primary-600" />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {[...eligible, ...others].map((p) => {
              const ok = eligible.includes(p);
              return (
                <Card key={p.id} className={cn("p-4", ok ? "border-success-500" : "opacity-80")}>
                  <div className="flex items-start gap-2">
                    {p.id === "ktx" ? <LuBuilding2 className="mt-0.5 size-4 text-primary-600" aria-hidden /> : <LuHandCoins className="mt-0.5 size-4 text-primary-600" aria-hidden />}
                    <p className="flex-1 text-sm font-semibold text-slate-900">{p.title}</p>
                    {ok && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
                        <LuCircleCheck className="size-3" aria-hidden /> Bạn có thể đủ điều kiện
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] text-slate-600">{p.summary}</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    <strong className="font-semibold text-slate-600">Cách nhận:</strong> {p.how}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Nguồn: {p.source}</p>
                </Card>
              );
            })}
          </div>
          {schools.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[620px] text-left text-[13px]">
                <caption className="px-5 pt-4 text-left text-sm font-semibold text-slate-900">Ở các trường bạn đã lưu</caption>
                <thead className="text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-2.5">
                      Trường
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Học bổng của trường
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Chỗ ở ước tính / năm
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map(({ school }) => {
                    const d = config.dormEstimate[school.type];
                    const months = 10;
                    const dormYear = d ? ((d.min + d.max) / 2) * months / 1000 : null;
                    const rentYear = (config.rentEstimate * months) / 1000;
                    return (
                      <tr key={school.id} className="border-t border-slate-100 align-top">
                        <td className="px-5 py-3 font-semibold text-slate-900">{school.shortName}</td>
                        <td className="px-3 py-3 text-slate-600">{school.scholarships}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {dorm && dormYear != null ? (
                            <>
                              <span className="font-semibold text-success-700">KTX ≈ {formatMillion(Math.round(dormYear * 10) / 10)}</span>
                              <span className="block text-xs text-slate-500">
                                ({d!.min}–{d!.max} nghìn/tháng · tiết kiệm ≈ {formatMillion(Math.round((rentYear - dormYear) * 10) / 10)} so với thuê trọ)
                              </span>
                            </>
                          ) : (
                            <>
                              Thuê trọ ≈ {formatMillion(rentYear)}
                              {d && <span className="block text-xs text-slate-500">Có KTX — tích “Nhà xa trường” để so sánh</span>}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
          <p className="flex gap-2 text-xs text-slate-500">
            <LuInfo className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Chính sách và mức hỗ trợ thay đổi theo từng năm và từng trường. Hãy hỏi phòng công tác sinh viên của trường và đối chiếu văn bản hiện hành trước khi tính toán.
          </p>
        </div>
      </div>
    </section>
  );
}
