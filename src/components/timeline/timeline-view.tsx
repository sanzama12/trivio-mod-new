"use client";

import { useEffect, useState } from "react";
import { LuBadgeCheck, LuBell, LuBellOff, LuCalendarPlus, LuDownload, LuExternalLink, LuMail, LuTriangleAlert } from "react-icons/lu";
import type { TimelineEvent } from "@/domain/types";
import { buildIcs, daysUntil, eventStatus, formatRange, googleCalendarUrl } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useLoginGate } from "@/components/auth/login-gate";

const CATEGORY: Record<TimelineEvent["category"], { label: string; tone: BadgeTone }> = {
  thi: { label: "Kỳ thi", tone: "danger" },
  "dang-ky": { label: "Đăng ký", tone: "primary" },
  "ket-qua": { label: "Kết quả", tone: "success" },
  "nhap-hoc": { label: "Nhập học", tone: "teal" },
  dgnl: { label: "ĐGNL", tone: "violet" },
};

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TimelineView({
  events,
  note,
  official = false,
  sourceUrl = null,
  emailReminders = null,
}: {
  events: TimelineEvent[];
  note: string;
  official?: boolean;
  sourceUrl?: string | null;
  /** null = khách (chưa đăng nhập) hoặc tài khoản chưa xác thực email. */
  emailReminders?: boolean | null;
}) {
  const [emailOn, setEmailOn] = useState<boolean | null>(emailReminders);
  const [savingEmail, setSavingEmail] = useState(false);
  const { hasReminder, toggleReminder, reminders, hydrated, user } = useTrovio();
  const { nudge } = useLoginGate();
  const toast = useToast();
  // Tính trạng thái sau khi mount để HTML server và client khớp nhau.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const reminded = events.filter((e) => reminders.includes(e.id));

  const toggle = (e: TimelineEvent) => {
    const on = toggleReminder(e.id);
    toast(on ? `Sẽ nhắc bạn trước “${e.title}”` : "Đã tắt nhắc", on ? "success" : "info");
    if (on && !user) {
      nudge({ title: "Đồng bộ lịch nhắc?", reason: "Nhắc hạn đang lưu trên trình duyệt này. Đăng nhập để giữ lịch nhắc trên mọi thiết bị." });
    }
  };

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
      <div>
        {official ? (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-success-100 bg-success-50 p-3.5 text-[13px] text-success-700">
            <LuBadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Lịch chính thức.</strong> {note}{" "}
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                  Xem văn bản gốc <LuExternalLink className="size-3" aria-hidden />
                  <span className="sr-only">(mở tab mới)</span>
                </a>
              )}
            </span>
          </p>
        ) : (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3.5 text-[13px] text-accent-700">
            <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Lịch minh hoạ.</strong> {note}
            </span>
          </p>
        )}
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
          {events.map((e) => {
            const status = now ? eventStatus(e, now) : "upcoming";
            const days = now ? daysUntil(e, now) : null;
            const on = hydrated && hasReminder(e.id);
            const cat = CATEGORY[e.category];
            return (
              <li key={e.id} className={cn("relative rounded-2xl border bg-white p-5 shadow-card", status === "ongoing" ? "border-primary-300" : "border-slate-200", status === "past" && "opacity-60")}>
                <span
                  className={cn(
                    "absolute top-6 -left-[33px] size-4 rounded-full border-4 border-white ring-2",
                    status === "past" ? "bg-slate-300 ring-slate-200" : status === "ongoing" ? "bg-primary-600 ring-primary-200" : "bg-white ring-primary-300",
                  )}
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-2">
                  <time dateTime={e.start} className="text-sm font-bold text-primary-700">
                    {formatRange(e)}
                  </time>
                  <Badge tone={cat.tone}>{cat.label}</Badge>
                  {now && status === "ongoing" && <Badge tone="solid">Đang diễn ra</Badge>}
                  {now && status === "upcoming" && days != null && days <= 30 && <Badge tone="accent">Còn {days} ngày</Badge>}
                  {now && status === "past" && <span className="text-xs text-slate-500">Đã qua</span>}
                </div>
                <h2 className="mt-2 font-bold text-slate-900">{e.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{e.desc}</p>
                {status !== "past" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={on ? "secondary" : "outline"} onClick={() => toggle(e)} aria-pressed={on}>
                      {on ? <LuBellOff className="size-4" aria-hidden /> : <LuBell className="size-4" aria-hidden />} {on ? "Tắt nhắc" : "Nhắc tôi"}
                    </Button>
                    <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
                      <LuCalendarPlus className="size-4" aria-hidden /> Google Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => download(`${e.id}.ics`, buildIcs([e]))}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <LuDownload className="size-4" aria-hidden /> Tải .ics
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <LuBell className="size-4 text-primary-600" aria-hidden /> Mốc bạn đang theo dõi
          </h2>
          {!hydrated ? (
            <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-100" />
          ) : reminded.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Bấm “Nhắc tôi” ở từng mốc. Trovio hiện nhắc trên web khi còn 14 ngày.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {reminded.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-semibold text-slate-800">{e.title}</p>
                    <p className="text-xs text-slate-500">{formatRange(e)}</p>
                  </li>
                ))}
              </ul>
              <Button size="sm" full className="mt-4" onClick={() => download("trovio-moc-tuyen-sinh.ics", buildIcs(reminded))}>
                <LuDownload className="size-4" aria-hidden /> Thêm tất cả vào lịch (.ics)
              </Button>
              <p className="mt-2 text-xs text-slate-500">File .ics mở được bằng Lịch iPhone, Google Calendar, Outlook — có báo trước 3 ngày và 1 ngày.</p>
            </>
          )}
          {hydrated && !user && reminded.length > 0 && <p className="mt-3 text-xs text-slate-500">Đăng nhập để đồng bộ lịch nhắc sang thiết bị khác.</p>}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <LuMail className="size-4 text-primary-600" aria-hidden /> Nhắc qua email
          </h2>
          {emailOn === null ? (
            <p className="mt-2 text-sm text-slate-500">Đăng nhập bằng tài khoản đã xác thực email để nhận email nhắc trước 7 ngày và 1 ngày cho các mốc đã bật “Nhắc tôi”.</p>
          ) : (
            <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary-600"
                checked={emailOn}
                disabled={savingEmail}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setSavingEmail(true);
                  const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailReminders: next }) }).catch(() => null);
                  setSavingEmail(false);
                  if (res?.ok) {
                    setEmailOn(next);
                    toast(next ? "Sẽ gửi email nhắc trước 7 ngày và 1 ngày" : "Đã tắt email nhắc", next ? "success" : "info");
                  } else toast("Không lưu được, thử lại sau", "warning");
                }}
              />
              <span>
                Gửi email nhắc trước <strong>7 ngày</strong> và <strong>1 ngày</strong> cho các mốc bạn đã bật “Nhắc tôi”.
                <span className="mt-1 block text-xs text-slate-500">Tắt bất cứ lúc nào tại đây. Nhắc qua Zalo chưa hỗ trợ.</span>
              </span>
            </label>
          )}
        </div>
      </aside>
    </div>
  );
}
