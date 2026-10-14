"use client";

import { useEffect, useState } from "react";
import type { ProgramView } from "@/services/program.service";

/** Gọi API /api/programs/lookup, giữ nguyên thứ tự id truyền vào. */
export function useProgramViews(ids: string[], enabled = true) {
  const [items, setItems] = useState<ProgramView[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!enabled) return;
    if (!key) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/programs/lookup?ids=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { items: ProgramView[] }) => {
        if (cancelled) return;
        const map = new Map(d.items.map((v) => [v.program.id, v]));
        setItems(key.split(",").map((id) => map.get(id)).filter((v): v is ProgramView => !!v));
      })
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return items;
}
