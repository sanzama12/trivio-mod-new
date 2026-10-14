"use client";

import { useMemo, useState } from "react";
import { LuChevronDown, LuSearch } from "react-icons/lu";
import type { FaqGroup } from "@/domain/types";
import { matchesQuery } from "@/lib/text";

export function FaqSearch({ groups }: { groups: FaqGroup[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter((i) => matchesQuery(q, i.q, i.a)) })).filter((g) => g.items.length),
    [q, groups],
  );
  const total = filtered.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <div className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-elevated">
        <LuSearch className="ml-3 size-5 text-slate-400" aria-hidden />
        <label htmlFor="faq-q" className="sr-only">
          Tìm câu hỏi
        </label>
        <input
          id="faq-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập từ khoá (ví dụ: học phí, RIASEC, điểm ưu tiên…)"
          className="h-11 min-w-0 flex-1 bg-transparent focus:outline-none"
        />
      </div>
      <p className="mt-3 text-center text-sm text-slate-500" aria-live="polite">
        {q ? `${total} câu hỏi phù hợp` : " "}
      </p>

      <div className="mt-8 space-y-8">
        {filtered.map((g) => (
          <section key={g.title}>
            <h3 className="mb-3 border-l-4 border-primary-600 pl-3 font-bold">{g.title}</h3>
            <div className="space-y-3">
              {g.items.map((i) => (
                <details key={i.q} className="group rounded-xl border border-slate-200 bg-white shadow-card open:border-primary-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {i.q}
                    <LuChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{i.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        {total === 0 && <p className="text-center text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp. Hãy liên hệ đội hỗ trợ bên dưới.</p>}
      </div>
    </div>
  );
}
