"use client";

import { useEffect } from "react";
import type { UsageKind } from "@/domain/types";
import { trackUsage } from "@/lib/track";

/** Không hiển thị gì: ghi nhận ẩn danh một lượt xem trường / ngành / chương trình hoặc một lượt tìm kiếm. */
export function UsageBeacon({ kind, id = "", active = true }: { kind: UsageKind; id?: string; active?: boolean }) {
  useEffect(() => {
    if (active) trackUsage(kind, id);
  }, [kind, id, active]);
  return null;
}
