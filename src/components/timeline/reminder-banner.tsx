"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuBellRing, LuX } from "react-icons/lu";
import type { TimelineEvent } from "@/domain/types";
import { formatRange, upcomingReminders } from "@/lib/timeline";
import { useTrovio } from "@/stores/trovio-store";

const DISMISS_KEY = "trovio:reminder-dismissed";

/** Nhắc trên web khi một mốc đã bật "Nhắc tôi" còn ≤ 14 ngày hoặc đang diễn ra. */
export function ReminderBanner({ events }: { events: TimelineEvent[] }) {
  const { reminders, hydrated } = useTrovio();
  const pathname = usePathname();
  const [now, setNow] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY));
    } catch {
      /* bỏ qua */
    }
  }, []);

  if (!hydrated || !now || pathname.startsWith("/moc-tuyen-sinh")) return null;
  const list = upcomingReminders(events, reminders, 14, now);
  if (list.length === 0) return null;
  const first = list[0];
  if (dismissed === first.event.id) return null;

  return (
    <div role="status" className="border-b border-accent-200 bg-accent-50" data-print-hide>
      <div className="container-page flex items-center gap-3 py-2.5 text-sm text-accent-700">
        <LuBellRing className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          <strong>{first.status === "ongoing" ? "Đang diễn ra" : first.days <= 0 ? "Hôm nay" : `Còn ${first.days} ngày`}:</strong> {first.event.title} ({formatRange(first.event)})
          {list.length > 1 && <span> · và {list.length - 1} mốc khác</span>}{" "}
          <Link href="/moc-tuyen-sinh" className="font-semibold underline">
            Xem lịch
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            setDismissed(first.event.id);
            try {
              window.sessionStorage.setItem(DISMISS_KEY, first.event.id);
            } catch {
              /* bỏ qua */
            }
          }}
          className="rounded p-1 hover:bg-accent-100"
          aria-label="Ẩn nhắc"
        >
          <LuX className="size-4" />
        </button>
      </div>
    </div>
  );
}
