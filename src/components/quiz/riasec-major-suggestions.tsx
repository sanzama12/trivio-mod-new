"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowUpRight, LuRotateCcw } from "react-icons/lu";
import type { RiasecMajorSuggestion } from "@/domain/riasec-guidance";
import type { RiasecResult } from "@/domain/types";

export function RiasecMajorSuggestions({ result }: { result: RiasecResult }) {
  const [items, setItems] = useState<RiasecMajorSuggestion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (result.isFlatProfile) return;
    const controller = new AbortController();
    fetch("/api/v1/quiz/major-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("suggestions unavailable");
      const data = await response.json() as { data?: RiasecMajorSuggestion[] };
      if (!Array.isArray(data.data)) throw new Error("invalid suggestions");
      setItems(data.data);
      setStatus("ready");
    }).catch(() => {
      if (!controller.signal.aborted) setStatus("error");
    });
    return () => controller.abort();
  }, [result, attempt]);

  if (result.isFlatProfile) return null;
  return <section className="mt-7 border-t border-slate-200 pt-6" aria-labelledby="quiz-major-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="quiz-major-title" className="text-lg font-bold text-slate-950">Ngành học nên tìm hiểu</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Gợi ý từ các nhóm sở thích nổi bật và các ngành đang có chương trình đào tạo. Đây không phải kết luận về năng lực học hay cơ hội trúng tuyển.</p>
      </div>
      <Link href="/nganh" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">Xem tất cả ngành <LuArrowUpRight className="size-4" aria-hidden /></Link>
    </div>
    {status === "loading" && <p role="status" className="mt-5 border-y border-slate-200 py-5 text-sm text-slate-600">Đang tải ngành học...</p>}
    {status === "error" && <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-slate-200 py-5 text-sm text-slate-600">
      <span>Chưa tải được gợi ý ngành.</span>
      <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline"><LuRotateCcw className="size-4" aria-hidden />Thử lại</button>
    </div>}
    {status === "ready" && (items.length ? <ol className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
      {items.map((item, index) => <li key={item.major.id} className="grid gap-2 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
        <span className="text-sm font-bold text-primary-700 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0">
          <Link href={`/nganh/${item.major.slug}`} className="font-bold text-slate-900 hover:text-primary-700 hover:underline">{item.major.name}</Link>
          <p className="mt-1 text-sm text-slate-600">{item.group.name}{item.major.code ? ` · Mã ${item.major.code}` : ""} · {item.programCount} chương trình</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{item.basis === "major" ? "Đối chiếu theo nhãn sở thích của ngành." : `Đối chiếu theo nhãn của nhóm ${item.group.name}; ngành này chưa có nhãn riêng.`}</p>
        </div>
        <span className="text-sm font-semibold text-primary-700 tabular-nums sm:text-right">{item.basis === "major" ? `${Math.round(item.interestIndex)}/100` : item.group.riasec.join("-")}<br /><span className="text-xs font-normal text-slate-500">{item.basis === "major" ? "chỉ số sở thích" : "nhãn nhóm"}</span></span>
      </li>)}
    </ol> : <p className="mt-5 border-y border-slate-200 py-5 text-sm text-slate-600">Chưa đủ dữ liệu để ưu tiên ngành cụ thể từ kết quả này. Hãy xem danh mục ngành và đối chiếu thêm môn học, trải nghiệm thực tế.</p>)}
  </section>;
}
