"use client";

/** Công tắc bật/tắt thống kê ẩn danh cho trình duyệt hiện tại (trang Chính sách quyền riêng tư). */
import { useEffect, useState } from "react";
import { setTrackingOptOut, trackingDisabled } from "@/lib/track";

export function TrackingToggle() {
  const [state, setState] = useState<"loading" | "on" | "off" | "browser">("loading");

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return setState("browser");
    setState(trackingDisabled() ? "off" : "on");
  }, []);

  if (state === "loading") return null;
  if (state === "browser") {
    return <p className="mt-3 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">Trình duyệt của bạn đang bật “Không theo dõi”, nên Trovio không gửi bất kỳ số liệu thống kê nào.</p>;
  }
  const on = state === "on";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="stats-toggle-label"
        onClick={() => {
          setTrackingOptOut(on);
          setState(on ? "off" : "on");
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary-600" : "bg-slate-500"}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
      <span id="stats-toggle-label" className="text-sm text-slate-700">
        Gửi thống kê ẩn danh từ trình duyệt này: <strong>{on ? "Đang bật" : "Đã tắt"}</strong>
      </span>
    </div>
  );
}
