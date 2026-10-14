"use client";

import { useState } from "react";
import { LuRefreshCw, LuDatabase, LuCircleCheck, LuTriangleAlert } from "react-icons/lu";

export function CronSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    syncedAt?: string;
    stats?: {
      schools: number;
      majors: number;
      programs: number;
      majorGroups: number;
      quiz: number;
      users: number;
    };
  } | null>(null);

  const handleSync = async () => {
    if (loading) return;
    const ok = window.confirm("Bạn có chắc chắn muốn chạy Cron làm mới và đồng bộ toàn bộ dữ liệu chính thức chuẩn Bộ GD&ĐT không?");
    if (!ok) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/cron-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        ok: false,
        message: `Lỗi kết nối máy chủ: ${err?.message || "Không thể đồng bộ"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 via-white to-sky-50 p-5 shadow-sm transition-all sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
              <LuDatabase className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Đồng bộ dữ liệu chuẩn Bộ GD&ĐT (Cron MOET)
            </h3>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              PostgreSQL / Neon
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Tự động kiểm tra tính toàn vẹn, cập nhật 61 trường, 53 ngành, 212 chương trình tuyển sinh &amp; điểm chuẩn vào cơ sở dữ liệu.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${
              loading
                ? "cursor-not-allowed bg-slate-400"
                : "bg-primary-600 hover:bg-primary-700 active:scale-95 hover:shadow-primary-500/25"
            }`}
          >
            <LuRefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang đồng bộ dữ liệu..." : "Chạy Cron Đồng Bộ Ngay"}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-xl p-4 text-sm transition-all ${
            result.ok
              ? "border border-success-200 bg-success-50 text-success-900"
              : "border border-danger-200 bg-danger-50 text-danger-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.ok ? (
              <LuCircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" />
            ) : (
              <LuTriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-600" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{result.message}</p>
              {result.stats && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-success-800">
                  <span>🏫 <b>{result.stats.schools}</b> trường ĐH/CĐ</span>
                  <span>📚 <b>{result.stats.majors}</b> ngành</span>
                  <span>🎯 <b>{result.stats.programs}</b> chương trình</span>
                  <span>🧩 <b>{result.stats.majorGroups}</b> nhóm ngành</span>
                  <span>👥 <b>{result.stats.users}</b> tài khoản</span>
                </div>
              )}
              {result.syncedAt && (
                <p className="text-xs text-slate-500">
                  Thời gian cập nhật: {new Date(result.syncedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
