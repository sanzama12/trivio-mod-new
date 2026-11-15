"use client";

import { useEffect, useState } from "react";
import type { ProgramYearData } from "@/domain/types";

/** Dữ liệu tuyển sinh theo năm của các chương trình; lỗi mạng chỉ làm các hàng này không hiện, không chặn trang. */
export function useProgramYears(ids: string[]) {
  const [years, setYears] = useState<Record<string, ProgramYearData[]>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/programs/years?ids=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { years?: Record<string, ProgramYearData[]> }) => { if (!cancelled) setYears(d.years ?? {}); })
      .catch(() => { if (!cancelled) setYears({}); });
    return () => { cancelled = true; };
  }, [key]);
  return years;
}
