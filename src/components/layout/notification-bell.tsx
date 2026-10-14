"use client";

/** Chuông thông báo: cảm nhận được duyệt/từ chối, báo lỗi đã xử lý, nhắc hạn tuyển sinh. */
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LuBell, LuCalendarClock, LuCircleCheck, LuCircleX, LuDatabase, LuMessageCircleQuestion, LuRoute, LuSchool } from "react-icons/lu";
import type { AppNotification } from "@/domain/types";
import { cn } from "@/lib/cn";

const ICON = {
  "review-approved": { Icon: LuCircleCheck, cls: "text-success-700 bg-success-50" },
  "review-rejected": { Icon: LuCircleX, cls: "text-danger-700 bg-danger-50" },
  "report-update": { Icon: LuDatabase, cls: "text-primary-700 bg-primary-50" },
  reminder: { Icon: LuCalendarClock, cls: "text-accent-700 bg-accent-50" },
  supplementary: { Icon: LuRoute, cls: "text-primary-700 bg-primary-50" },
  "class-reminder": { Icon: LuSchool, cls: "text-accent-700 bg-accent-50" },
  "qa-answer": { Icon: LuMessageCircleQuestion, cls: "text-success-700 bg-success-50" },
  "survey-invite": { Icon: LuMessageCircleQuestion, cls: "text-primary-700 bg-primary-50" },
  "school-submission": { Icon: LuSchool, cls: "text-primary-700 bg-primary-50" },
} as const;

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { items: AppNotification[]; unread: number };
      setItems(d.items);
      setUnread(d.unread);
    } catch {
      /* mạng lỗi: thử lại lần sau */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
  };

  const openOne = (n: AppNotification) => {
    if (n.read) return;
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    void fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => null);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        className="relative flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-primary-200"
      >
        <LuBell className="size-[18px]" aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-700 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} role="region" aria-label="Thông báo" className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Thông báo</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-semibold text-primary-700 hover:underline">
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => {
                const { Icon, cls } = ICON[n.kind] ?? ICON["report-update"];
                const body = (
                  <>
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", cls)}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 whitespace-normal">
                      <span className={cn("block text-sm", n.read ? "text-slate-700" : "font-semibold text-slate-900")}>{n.title}</span>
                      <span className="mt-0.5 block text-[13px] text-slate-600">{n.body}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {ago(n.createdAt)}
                        {!n.read && <span className="sr-only"> · chưa đọc</span>}
                      </span>
                    </span>
                    {!n.read && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-primary-600" />}
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => { openOne(n); setOpen(false); }} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                        {body}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => openOne(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50">
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
