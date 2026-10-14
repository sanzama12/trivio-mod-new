"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tabs({ tabs, initial = 0, className }: { tabs: { label: string; content: ReactNode }[]; initial?: number; className?: string }) {
  const [active, setActive] = useState(initial);
  const id = useId();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => (a + 1) % tabs.length);
    if (e.key === "ArrowLeft") setActive((a) => (a - 1 + tabs.length) % tabs.length);
  };
  return (
    <div className={className}>
      <div role="tablist" className="flex overflow-x-auto border-b border-slate-200" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            id={`${id}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-5 py-3 text-sm whitespace-nowrap transition-colors",
              active === i ? "border-primary-600 font-semibold text-primary-700" : "border-transparent font-medium text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} hidden={active !== i} className="pt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
