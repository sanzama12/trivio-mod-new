"use client";

import { useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import type { Interest } from "@/domain/types";
import { cn } from "@/lib/cn";

export type PublicInterest = Omit<Interest, "majorIds">;
let cache: Promise<PublicInterest[]> | null = null;

/** Tải danh mục sở thích / lĩnh vực một lần cho cả phiên duyệt web. */
export function useInterests() {
  const [items, setItems] = useState<PublicInterest[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    cache ??= fetch("/api/interests")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items?: PublicInterest[] }) => (Array.isArray(d.items) ? d.items : []))
      .catch(() => { cache = null; return [] as PublicInterest[]; });
    void cache.then((list) => { if (alive) { setItems(list); setLoaded(true); } });
    return () => { alive = false; };
  }, []);
  return { items, loaded };
}

/** Chọn nhiều sở thích và lĩnh vực nghề nghiệp. Không hiện gì nếu quản trị viên chưa tạo mục nào. */
export function InterestPicker({ selected, onToggle, onClear, idPrefix = "interest", className, only }: { selected: string[]; onToggle: (id: string) => void; onClear?: () => void; idPrefix?: string; className?: string; only?: PublicInterest["kind"] }) {
  const { items: all } = useInterests();
  const items = only ? all.filter((i) => i.kind === only) : all;
  if (items.length === 0) return null;
  const groups: { label: string; list: PublicInterest[] }[] = [
    { label: "Sở thích", list: items.filter((i) => i.kind === "interest") },
    { label: "Lĩnh vực nghề nghiệp", list: items.filter((i) => i.kind === "field") },
  ].filter((g) => g.list.length > 0);
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <p id={`${idPrefix}-label`} className="text-xs font-semibold tracking-wide text-slate-700">{only === "interest" ? "Sở thích" : only === "field" ? "Lĩnh vực nghề nghiệp" : "Sở thích và lĩnh vực nghề nghiệp"} ({selected.length} đã chọn)</p>
        {selected.length > 0 && onClear && (
          <button type="button" onClick={onClear} className="min-h-6 text-xs font-semibold text-slate-600 hover:text-slate-800">Xoá chọn</button>
        )}
      </div>
      <div className="space-y-3" role="group" aria-labelledby={`${idPrefix}-label`}>
        {groups.map((g) => (
          <div key={g.label}>
            {groups.length > 1 && <p className="mb-1.5 text-xs text-slate-600">{g.label}</p>}
            <div className="flex flex-wrap gap-2">
              {g.list.map((it) => {
                const active = selected.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-pressed={active}
                    title={it.description || undefined}
                    onClick={() => onToggle(it.id)}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all",
                      active ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                    )}
                  >
                    {active && <LuCheck className="size-3.5" aria-hidden />}
                    <span>{it.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
