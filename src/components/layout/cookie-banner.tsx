"use client";

/**
 * Thanh đồng ý cookie (UI Patterns · Section 3). Cookie đăng nhập là cần thiết (luôn bật);
 * thống kê hành vi ẩn danh chỉ chạy sau khi người dùng đồng ý (xem lib/track.ts → hasAnalyticsConsent).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_KEY, readConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    if (readConsent() === null) setShow(true);
    const onStorage = (e: StorageEvent) => e.key === CONSENT_KEY && setShow(readConsent() === null);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  if (!show) return null;

  const save = (value: boolean) => {
    writeConsent(value);
    setShow(false);
  };

  return (
    <section aria-label="Cài đặt cookie" className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[560px] sm:p-0" data-print-hide>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-elevated">
        <p className="text-xs font-bold tracking-[0.12em] text-primary-600 uppercase">Privacy &amp; Settings</p>
        <p className="mt-2 text-sm text-slate-700">
          Trovio dùng cookie cần thiết để giữ đăng nhập, và (nếu bạn đồng ý) thống kê lượt dùng <b>ẩn danh</b> để biết người dùng gặp khó ở bước nào. Bấm “Chấp nhận” nghĩa là bạn đồng ý với{" "}
          <Link href="/chinh-sach-rieng-tu" className="font-semibold text-primary-700 underline">
            chính sách riêng tư
          </Link>
          .
        </p>
        {custom && (
          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
            <label className="flex items-start gap-2 text-slate-500">
              <input type="checkbox" checked disabled className="mt-0.5 size-4" /> Cookie cần thiết (đăng nhập, bảo mật) — luôn bật
            </label>
            <label className="flex items-start gap-2 text-slate-800">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary-600" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Thống kê hành vi ẩn danh (không gắn với tài khoản)
            </label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {custom ? (
            <button type="button" onClick={() => save(analytics)} className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700">
              Lưu lựa chọn
            </button>
          ) : (
            <button type="button" onClick={() => save(true)} className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700">
              Chấp nhận
            </button>
          )}
          <button type="button" onClick={() => (custom ? save(false) : setCustom(true))} className="h-10 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {custom ? "Chỉ cookie cần thiết" : "Tuỳ chỉnh"}
          </button>
        </div>
      </div>
    </section>
  );
}
