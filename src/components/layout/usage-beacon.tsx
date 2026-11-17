"use client";

import { useEffect } from "react";
import type { UsageKind } from "@/domain/types";
import { trackUsage } from "@/lib/track";
import { browsingPersonalizationEnabled, trackContentView } from "@/lib/browsing-history";

/** Không hiển thị gì: ghi nhận ẩn danh một lượt xem trường / ngành / chương trình hoặc một lượt tìm kiếm. */
export function UsageBeacon({ kind, id = "", active = true, personalize = true }: { kind: UsageKind; id?: string; active?: boolean; personalize?: boolean }) {
  useEffect(() => {
    if (active) trackUsage(kind, id);
  }, [kind, id, active]);
  useEffect(() => {
    if (!active || !personalize || !id || (kind !== "major_view" && kind !== "school_view" && kind !== "program_view")) return;
    // Count only an actual five-second visit while the page is visible.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let recorded = false;
    const schedule = () => {
      clearTimeout(timer);
      if (recorded || document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        if (!browsingPersonalizationEnabled()) return;
        trackContentView(kind, id);
        recorded = true;
      }, 5000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("trovio:consent-changed", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("trovio:consent-changed", schedule);
    };
  }, [kind, id, active, personalize]);
  return null;
}
