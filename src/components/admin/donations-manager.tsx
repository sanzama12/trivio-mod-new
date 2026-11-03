"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LuBadgeDollarSign,
  LuCalendar,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuDownload,
  LuHandHeart,
  LuMail,
  LuMessageSquare,
  LuRefreshCw,
  LuSearch,
  LuTriangleAlert,
  LuWallet,
} from "react-icons/lu";
import type { DonationRecord, DonationStats } from "@database/repositories";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function DonationsManager({
  initialStats,
  initialItems,
  initialTotal,
  currentStatus = "all",
  currentSearch = "",
}: {
  initialStats: DonationStats;
  initialItems: DonationRecord[];
  initialTotal: number;
  currentStatus?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [selectedTxn, setSelectedTxn] = useState<DonationRecord | null>(null);

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  const handleFilterChange = (newStatus: string) => {
    setStatus(newStatus);
    startTransition(() => {
      const sp = new URLSearchParams(window.location.search);
      if (newStatus === "all") {
        sp.delete("status");
      } else {
        sp.set("status", newStatus);
      }
      sp.set("page", "1");
      router.push(`/quan-tri/doanh-thu?${sp.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const sp = new URLSearchParams(window.location.search);
      if (search.trim()) {
        sp.set("q", search.trim());
      } else {
        sp.delete("q");
      }
      sp.set("page", "1");
      router.push(`/quan-tri/doanh-thu?${sp.toString()}`);
    });
  };

  const handleExportCsv = () => {
    if (!initialItems.length) return;
    const headers = [
      "Mã đơn (TxnRef)",
      "Mã GD VNPay",
      "Người ủng hộ",
      "Email",
      "Số tiền (VNĐ)",
      "Trạng thái",
      "Ngân hàng",
      "Lời nhắn",
      "Thời gian tạo",
      "Thời gian thanh toán",
    ];
    const rows = initialItems.map((r) => [
      r.vnpTxnRef,
      r.vnpTransactionNo || "",
      `"${(r.donorName || "").replace(/"/g, '""')}"`,
      r.donorEmail || "",
      r.amount,
      r.status,
      r.vnpBankCode || "",
      `"${(r.message || "").replace(/"/g, '""')}"`,
      r.createdAt,
      r.paidAt || "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trovio-donations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const successRate =
    initialStats.totalCount > 0
      ? Math.round((initialStats.successCount / initialStats.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 4 Thẻ KPI Doanh thu & Ủng hộ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-primary-200 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-primary-700 uppercase">
              Tổng doanh thu tích luỹ
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <LuWallet className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {formatVnd(initialStats.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {initialStats.successCount} lượt ủng hộ thành công
          </p>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
              Doanh thu tháng này
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <LuCalendar className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {formatVnd(initialStats.thisMonthRevenue)}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Hôm nay: <b className="font-semibold">{formatVnd(initialStats.todayRevenue)}</b>
          </p>
        </Card>

        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-sky-800 uppercase">
              Tỷ lệ thanh toán
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
              <LuCircleCheck className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{successRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {initialStats.pendingCount} đang chờ xử lý · {initialStats.failedCount} thất bại
          </p>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
              Khoản ủng hộ kỷ lục
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
              <LuBadgeDollarSign className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {formatVnd(initialStats.maxAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Trung bình: {formatVnd(initialStats.avgAmount)} / lượt
          </p>
        </Card>
      </div>

      {/* Thanh tác vụ: Tìm kiếm, Bộ lọc trạng thái & Xuất file */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, mã VNPay hoặc mã đơn..."
            className="w-full pl-10 pr-20"
          />
          <LuSearch className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <button
            type="submit"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary-700"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs bộ lọc */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            {[
              { id: "all", label: "Tất cả" },
              { id: "success", label: "Thành công" },
              { id: "pending", label: "Đang chờ" },
              { id: "failed", label: "Thất bại" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-all",
                  status === tab.id
                    ? "bg-white text-primary-700 shadow-sm"
                    : "hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!initialItems.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <LuDownload className="size-4 text-slate-500" />
            Xuất CSV
          </button>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="Tải lại dữ liệu"
          >
            <LuRefreshCw className={cn("size-4 text-slate-500", isPending && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Bảng kê lịch sử giao dịch */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Người ủng hộ
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Số tiền (VNĐ)
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Mã giao dịch / Ngân hàng
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Lời nhắn
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <LuHandHeart className="mx-auto mb-2 size-8 text-slate-300" />
                    <p className="font-medium">Chưa có giao dịch ủng hộ nào khớp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                initialItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{item.donorName}</div>
                      {item.donorEmail && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <LuMail className="size-3" />
                          {item.donorEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900">
                      <span className="text-primary-700">{formatVnd(item.amount)}</span>
                    </td>
                    <td className="px-4 py-4">
                      {item.status === "success" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <LuCircleCheck className="size-3.5" /> Thành công
                        </span>
                      )}
                      {item.status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <LuClock className="size-3.5" /> Chờ thanh toán
                        </span>
                      )}
                      {(item.status === "failed" || item.status === "cancelled") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          <LuCircleX className="size-3.5" /> Thất bại
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs text-slate-700">
                        {item.vnpTransactionNo || item.vnpTxnRef}
                      </div>
                      {item.vnpBankCode && (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {item.vnpBankCode}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-4 text-xs text-slate-600">
                      {item.message || "—"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      <div>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTxn(item)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal chi tiết hoá đơn giao dịch */}
      {selectedTxn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết giao dịch ủng hộ</h3>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Mã tham chiếu:</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedTxn.vnpTxnRef}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Mã giao dịch VNPay:</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedTxn.vnpTransactionNo || "Chưa có"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Người ủng hộ:</span>
                <span className="font-semibold text-slate-900">{selectedTxn.donorName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-800">{selectedTxn.donorEmail || "Không cung cấp"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Số tiền:</span>
                <span className="text-base font-bold text-primary-700">
                  {formatVnd(selectedTxn.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Ngân hàng thanh toán:</span>
                <span className="font-medium text-slate-800">
                  {selectedTxn.vnpBankCode || "VNPay"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Trạng thái:</span>
                <span>
                  {selectedTxn.status === "success" && (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      Thành công
                    </span>
                  )}
                  {selectedTxn.status === "pending" && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Đang chờ
                    </span>
                  )}
                  {selectedTxn.status === "failed" && (
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                      Thất bại
                    </span>
                  )}
                </span>
              </div>
              {selectedTxn.message && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
                    <LuMessageSquare className="size-3.5" /> Lời nhắn gửi:
                  </div>
                  <p className="italic">"{selectedTxn.message}"</p>
                </div>
              )}
              <div className="flex justify-between py-1 text-xs text-slate-400">
                <span>Thời gian tạo:</span>
                <span>{new Date(selectedTxn.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              {selectedTxn.paidAt && (
                <div className="flex justify-between py-1 text-xs text-emerald-700">
                  <span>Thanh toán lúc:</span>
                  <span>{new Date(selectedTxn.paidAt).toLocaleString("vi-VN")}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

