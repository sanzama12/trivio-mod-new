"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowRight, LuCircleCheck, LuClock3, LuHandHeart, LuRefreshCw } from "react-icons/lu";
import type { DonationPayment } from "@/domain/donation";
import type { donationService } from "@/services/donation.service";
import { Breadcrumb } from "@/components/ui/misc";
import styles from "./donation-history.module.css";

const DonationSuccess = dynamic(() => import("./donation-success").then((module) => module.DonationSuccess), { ssr: false });
type HistoryItem = Awaited<ReturnType<typeof donationService.listForUser>>[number];
type Confirmation = { payment: Pick<DonationPayment, "txnRef" | "amount" | "method">; confirmedAt: string };

const statusText = {
  success: "Đã xác nhận",
  pending: "Đang đối soát",
  failed: "Không thành công",
  cancelled: "Đã hủy",
} as const;
const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
}) : "Chưa xác nhận";
const methodOf = (ref: string): DonationPayment["method"] => ref.startsWith("TROVIO_") ? "vnpay" : ref.startsWith("TS") || ref.startsWith("TROVIOSEPAY") ? "sepay" : "qr";
const methodText = { qr: "Chuyển khoản QR", sepay: "SePay", vnpay: "VNPAY" };

export function DonationHistory({ initialItems }: { initialItems: HistoryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setItems(initialItems); }, [initialItems]);

  const pending = items.filter((item) => item.status === "pending");
  const pendingRefs = pending.slice(0, 5).map((item) => item.vnpTxnRef).join("|");
  useEffect(() => {
    if (!pendingRefs) return;
    let cancelled = false;
    let checking = false;
    const refs = pendingRefs.split("|");
    const check = async () => {
      if (cancelled || checking || document.visibilityState !== "visible") return;
      checking = true;
      for (const ref of refs) {
        if (cancelled) break;
        try {
          const response = await fetch(`/api/donations/status/${encodeURIComponent(ref)}`, { cache: "no-store" });
          if (!response.ok) continue;
          const body = await response.json() as { data?: { status: HistoryItem["status"]; paidAt: string | null } };
          if (cancelled || !body.data || body.data.status === "pending") continue;
          const previous = items.find((item) => item.vnpTxnRef === ref);
          if (!previous) continue;
          setItems((current) => current.map((item) => item.vnpTxnRef === ref ? { ...item, status: body.data!.status, paidAt: body.data!.paidAt } : item));
          if (body.data.status === "success") {
            setConfirmation({ payment: { txnRef: ref, amount: previous.amount, method: methodOf(ref) }, confirmedAt: body.data.paidAt ?? new Date().toISOString() });
          }
        } catch { /* Try again on the next check. */ }
      }
      checking = false;
    };
    void check();
    const timer = window.setInterval(() => void check(), 4000);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [pendingRefs, items]);

  const confirmed = items.filter((item) => item.status === "success");
  const total = confirmed.reduce((sum, item) => sum + item.amount, 0);
  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  };

  return <div className={styles.page}>
    <div className="container-page">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Ủng hộ Trovio", href: "/ung-ho" }, { label: "Lịch sử ủng hộ" }]} />
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>TÀI KHOẢN / ỦNG HỘ</span>
          <h1>Lịch sử ủng hộ</h1>
          <p>Các khoản ủng hộ thực hiện khi bạn đăng nhập. Đối chiếu trạng thái bằng mã giao dịch bên dưới.</p>
        </div>
        <Link href="/ung-ho" className={styles.newDonation}>Ủng hộ thêm <LuArrowRight aria-hidden /></Link>
      </header>

      <section className={styles.overview} aria-label="Tổng quan giao dịch">
        <div><span>Đã xác nhận</span><strong>{money(total)}</strong><small>Trong {items.length} giao dịch gần nhất</small></div>
        <div><span>Giao dịch hoàn tất</span><strong>{confirmed.length.toLocaleString("vi-VN")}</strong><small>Đã được hệ thống ghi nhận</small></div>
        <div><span>Đang đối soát</span><strong>{pending.length.toLocaleString("vi-VN")}</strong><small>Tự kiểm tra 5 giao dịch chờ gần nhất</small></div>
      </section>

      <div className={styles.listHeading}>
        <div><h2>Giao dịch gần đây</h2><p>Hiển thị tối đa 50 giao dịch mới nhất.</p></div>
        <button type="button" className={styles.refresh} onClick={refresh} disabled={refreshing} title="Làm mới lịch sử"><LuRefreshCw aria-hidden className={refreshing ? styles.spinning : ""} />Làm mới</button>
      </div>

      {items.length === 0 ? <div className={styles.empty}>
        <LuHandHeart aria-hidden />
        <h3>Chưa có giao dịch nào</h3>
        <p>Các khoản ủng hộ thực hiện khi đăng nhập sẽ được hiển thị tại đây.</p>
        <Link href="/ung-ho">Đến trang ủng hộ <LuArrowRight aria-hidden /></Link>
      </div> : <ol className={styles.list} aria-label="Danh sách giao dịch ủng hộ">
        {items.map((item) => <li key={item.id} className={styles.row}>
          <div className={styles.rowMain}>
            <span className={styles.methodIcon} aria-hidden>{item.status === "success" ? <LuCircleCheck /> : <LuClock3 />}</span>
            <div className={styles.rowTitle}>
              <strong>{money(item.amount)}</strong>
              <span>{methodText[methodOf(item.vnpTxnRef)]} <span aria-hidden>·</span> {when(item.createdAt)}</span>
            </div>
          </div>
          <div className={styles.rowMeta}>
            <span className={styles.status} data-status={item.status}>{statusText[item.status]}</span>
            <span className={styles.reference}>Mã: <code>{item.vnpTxnRef}</code></span>
          </div>
          <details className={styles.details}>
            <summary>Chi tiết giao dịch</summary>
            <dl>
              <div><dt>Khởi tạo</dt><dd>{when(item.createdAt)}</dd></div>
              <div><dt>Xác nhận</dt><dd>{when(item.paidAt)}</dd></div>
              {item.vnpBankCode && <div><dt>Ngân hàng</dt><dd>{item.vnpBankCode}</dd></div>}
              {item.vnpTransactionNo && <div><dt>Mã từ cổng thanh toán</dt><dd>{item.vnpTransactionNo}</dd></div>}
              {item.message && <div><dt>Lời nhắn</dt><dd>{item.message}</dd></div>}
            </dl>
            {item.status === "pending" && <p>Giao dịch đang được đối soát. Chỉ chuyển khoản một lần với đúng số tiền và nội dung mã tham chiếu.</p>}
            {item.status === "failed" && <p>Trạng thái này không xác nhận ngân hàng đã hoàn tiền. Hãy kiểm tra lịch sử chuyển khoản trước khi thử lại.</p>}
          </details>
        </li>)}
      </ol>}
      <p className={styles.support}>Cần hỗ trợ giao dịch? <Link href="/lien-he">Liên hệ Trovio</Link> và cung cấp mã tham chiếu.</p>
    </div>
    {confirmation && <DonationSuccess payment={confirmation.payment} confirmedAt={confirmation.confirmedAt} onClose={() => setConfirmation(null)} onAgain={() => router.push("/ung-ho")} />}
  </div>;
}
