import { repositories, type DonationRecord, type DonationStats } from "@database/repositories";
import { buildVnpayPaymentUrl, verifyVnpayCallback } from "./vnpay.service";
import { randomUUID } from "node:crypto";
import { emailError } from "@/lib/email-validation";
import QRCode from "qrcode";
import { ANONYMOUS_DONOR_NAME, publicDonorName, type DonationPayment, type DonationPaymentMethod } from "@/domain/donation";
import { buildTransferQr, getDonationPaymentAvailability, getTransferConfig, isDonationPaymentMethod } from "./donation-payment.service";
import { fetchBankHistory, matchesBankTransfer } from "./bank-history.service";

export interface CreateDonationInput {
  amount: number;
  donorName?: string;
  donorEmail?: string;
  message?: string;
  bankCode?: string;
  method?: DonationPaymentMethod;
}

export type CreateDonationResult = DonationPayment;

export class DonationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DonationValidationError";
  }
}

export class DonationUnavailableError extends Error {}

// In-memory cache để loại bỏ query chậm trên trang chủ và API public
let cachedStats: DonationStats | null = null;
let statsCachedAt = 0;
const STATS_CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

type PublicDonor = { id: string; name: string; amount: number; paidAt: string | null };
let cachedRecentDonors: PublicDonor[] | null = null;
let recentDonorsCachedAt = 0;
const RECENT_DONORS_CACHE_TTL_MS = 30 * 1000; // 30s cache TTL

export function invalidateDonationCache(): void {
  cachedStats = null;
  statsCachedAt = 0;
  cachedRecentDonors = null;
  recentDonorsCachedAt = 0;
}

export const donationService = {
  rangeReport(from: string, to: string) {
    return repositories.donations.rangeReport(from, to);
  },
  async refreshQrPayment(donation: DonationRecord, fetchImpl: typeof fetch = fetch) {
    if (donation.status !== "pending" || !/^(?:TQ[A-F0-9]{12}(?:[A-F0-9]{4})?|TROVIOQR[A-F0-9]{32})$/.test(donation.vnpTxnRef)) {
      return { donation, verificationUnavailable: false };
    }
    const bank = getTransferConfig("qr");
    if (!bank) return { donation, verificationUnavailable: true };
    const transfers = await fetchBankHistory(fetchImpl);
    if (!transfers) return { donation, verificationUnavailable: true };
    const matched = transfers.find((transfer) => matchesBankTransfer(transfer, {
      accountNumber: bank.accountNumber, amount: donation.amount, txnRef: donation.vnpTxnRef,
    }));
    if (!matched) return { donation, verificationUnavailable: false };
    const confirmed = await repositories.donations.confirmBankTransfer(donation.vnpTxnRef, donation.amount, matched.transactionId, bank.bankCode);
    if (confirmed) {
      invalidateDonationCache();
      return { donation: confirmed, verificationUnavailable: false };
    }
    return { donation: await repositories.donations.getByTxnRef(donation.vnpTxnRef) ?? donation, verificationUnavailable: false };
  },
  /**
   * Khởi tạo giao dịch ủng hộ và tạo link thanh toán VNPay
   */
  async createDonation(
    input: CreateDonationInput,
    clientIp?: string | null,
    userId?: string | null
  ): Promise<CreateDonationResult> {
    const rawAmount = Number(input.amount);
    if (!Number.isSafeInteger(rawAmount) || rawAmount < 10000) {
      throw new DonationValidationError("Số tiền ủng hộ tối thiểu là 10.000 VNĐ.");
    }
    if (rawAmount > 100000000) {
      throw new DonationValidationError("Số tiền ủng hộ tối đa cho mỗi lượt là 100.000.000 VNĐ.");
    }
    const amount = Math.round(rawAmount);

    let donorName = (input.donorName || "").trim();
    if (!donorName) {
      donorName = ANONYMOUS_DONOR_NAME;
    } else if (donorName.length > 80) {
      donorName = donorName.slice(0, 80);
    }

    let donorEmail: string | null = null;
    if (input.donorEmail && input.donorEmail.trim()) {
      const trimmedEmail = input.donorEmail.trim();
      if (emailError(trimmedEmail)) {
        throw new DonationValidationError("Địa chỉ email không đúng định dạng.");
      }
      donorEmail = trimmedEmail;
    }

    let message: string | null = null;
    if (input.message && input.message.trim()) {
      message = input.message.trim().slice(0, 500);
    }

    const method = input.method ?? "vnpay";
    if (!isDonationPaymentMethod(method)) throw new DonationValidationError("Phương thức thanh toán không hợp lệ.");
    if (!getDonationPaymentAvailability()[method]) throw new DonationUnavailableError("Phương thức này đang chờ cấu hình nhận tiền. Vui lòng chọn phương thức khác hoặc liên hệ đội ngũ.");
    if (input.bankCode && !["VNPAYQR", "VNBANK", "INTCARD"].includes(input.bankCode)) {
      throw new DonationValidationError("Phương thức thanh toán không hợp lệ.");
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const prefix = method === "vnpay" ? "TROVIO_" : method === "sepay" ? "TS" : "TQ";
      const txnRef = `${prefix}${randomUUID().replaceAll("-", "").slice(0, method === "vnpay" ? 32 : 16).toUpperCase()}`;
      const orderInfo = `Ung ho Trovio ${txnRef}`;
      const paymentUrl = method === "vnpay" ? buildVnpayPaymentUrl({
        txnRef, amount, orderInfo, ipAddress: clientIp, bankCode: input.bankCode,
      }) : "";
      const payment = method === "vnpay"
        ? { qrImageUrl: await QRCode.toDataURL(paymentUrl, { width: 320, margin: 4, errorCorrectionLevel: "M" }) }
        : buildTransferQr(method, amount, txnRef, donorName);

      try {
        const donation = await repositories.donations.create({
          donorName,
          donorEmail,
          amount,
          message,
          orderInfo,
          vnpTxnRef: txnRef,
          ipAddress: clientIp ?? null,
          userId: userId ?? null,
        });
        return { donationId: donation.id, txnRef, paymentUrl, amount, method, ...payment };
      } catch (error) {
        if ((error as { code?: string })?.code !== "23505" || attempt === 2) throw error;
      }
    }
    throw new Error("Không thể tạo mã giao dịch duy nhất.");
  },

  async processSepayWebhook(payload: Record<string, unknown>): Promise<void> {
    if (payload.transferType !== "in") return;
    const transactionId = payload.id;
    const amount = Number(payload.transferAmount);
    if ((!Number.isSafeInteger(transactionId) && typeof transactionId !== "string") || !transactionId || !Number.isSafeInteger(amount) || amount <= 0) {
      throw new DonationValidationError("Giao dịch SePay không hợp lệ.");
    }
    const content = `${typeof payload.code === "string" ? payload.code : ""} ${typeof payload.content === "string" ? payload.content : ""}`;
    const refs = [...new Set(content.toUpperCase().match(/(?:TQ|TS)[A-F0-9]{16}(?![A-Z0-9])|(?:TQ|TS)[A-F0-9]{12}(?![A-Z0-9])|TROVIO(?:SEPAY|QR)[A-F0-9]{32}(?![A-Z0-9])/g))];
    if (refs.length !== 1) return;
    const txnRef = refs[0];
    const config = getTransferConfig(txnRef.startsWith("TROVIOSEPAY") || txnRef.startsWith("TS") ? "sepay" : "qr");
    if (!config || String(payload.accountNumber ?? "") !== config.accountNumber) {
      throw new DonationValidationError("Tài khoản nhận tiền không khớp.");
    }
    const existing = await repositories.donations.getByTxnRef(txnRef);
    if (!existing) return;
    if (existing.amount !== amount) throw new DonationValidationError("Số tiền không khớp với giao dịch.");
    if (existing.status !== "pending") return;
    await repositories.donations.confirmBankTransfer(txnRef, amount, `SEPAY_${transactionId}`, config.bankCode);
    invalidateDonationCache();
  },

  /**
   * Xử lý kết quả trả về từ trình duyệt của người dùng (VNPay Return URL)
   */
  async processReturn(queryParams: Record<string, string | string[] | undefined>): Promise<{
    success: boolean;
    message: string;
    donation: DonationRecord | null;
  }> {
    const verified = verifyVnpayCallback(queryParams);
    if (!verified.isValid) {
      return {
        success: false,
        message: "Chữ ký xác thực giao dịch VNPay không hợp lệ.",
        donation: null,
      };
    }

    const existing = await repositories.donations.getByTxnRef(verified.txnRef);
    if (!existing) {
      return {
        success: false,
        message: "Không tìm thấy thông tin đơn giao dịch trong hệ thống.",
        donation: null,
      };
    }

    if (Number(existing.amount) !== verified.amount) {
      return { success: false, message: "Số tiền xác thực không khớp với giao dịch.", donation: null };
    }

    // Cập nhật trạng thái nếu đơn vẫn đang pending
    if (existing.status === "pending") {
      const updated = await repositories.donations.updatePaymentResult(verified.txnRef, {
        status: verified.isSuccess ? "success" : "failed",
        transactionNo: verified.transactionNo,
        bankCode: verified.bankCode,
        cardType: verified.cardType,
        payDate: verified.payDate,
        responseCode: verified.responseCode,
      });

      // Xóa cache thống kê & danh sách để cập nhật doanh thu ngay lập tức
      invalidateDonationCache();

      const confirmed = updated ?? await repositories.donations.getByTxnRef(verified.txnRef) ?? existing;
      return {
        success: confirmed.status === "success",
        message: confirmed.status === "success"
          ? "Thanh toán ủng hộ thành công! Chân thành cảm ơn tấm lòng hảo tâm của bạn."
          : `Giao dịch chưa hoàn tất (Mã lỗi: ${verified.responseCode}).`,
        donation: confirmed,
      };
    }

    return {
      success: existing.status === "success",
      message:
        existing.status === "success"
          ? "Giao dịch đã được ghi nhận thành công trước đó."
          : `Giao dịch không thành công (Mã phản hồi: ${existing.vnpResponseCode || "không xác định"}).`,
      donation: existing,
    };
  },

  /**
   * Xử lý webhook Instant Payment Notification (IPN) ngầm từ máy chủ VNPay
   */
  async processIpn(queryParams: Record<string, string | string[] | undefined>): Promise<{
    RspCode: string;
    Message: string;
  }> {
    const verified = verifyVnpayCallback(queryParams);
    if (!verified.isValid) {
      return { RspCode: "97", Message: "Invalid Checksum" };
    }

    const existing = await repositories.donations.getByTxnRef(verified.txnRef);
    if (!existing) {
      return { RspCode: "01", Message: "Order Not Found" };
    }

    // Kiểm tra số tiền khớp
    if (Math.round(existing.amount) !== verified.amount) {
      return { RspCode: "04", Message: "Invalid Amount" };
    }

    // Nếu đã cập nhật rồi thì trả về idempotent
    if (existing.status !== "pending") {
      return { RspCode: "02", Message: "Order already confirmed" };
    }

    await repositories.donations.updatePaymentResult(verified.txnRef, {
      status: verified.isSuccess ? "success" : "failed",
      transactionNo: verified.transactionNo,
      bankCode: verified.bankCode,
      cardType: verified.cardType,
      payDate: verified.payDate,
      responseCode: verified.responseCode,
    });

    // Cập nhật doanh thu ngay tức thì
    invalidateDonationCache();

    return { RspCode: "00", Message: "Confirm Success" };
  },

  /**
   * Thống kê tổng hợp doanh thu và số liệu ủng hộ cho quản trị viên (có RAM cache 60s)
   */
  /** Lịch sử đóng góp của chính tài khoản đang đăng nhập (không chứa IP hay mã nội bộ của cổng thanh toán). */
  async listForUser(userId: string): Promise<Array<Pick<DonationRecord, "id" | "amount" | "status" | "message" | "vnpTxnRef" | "vnpBankCode" | "vnpTransactionNo" | "createdAt" | "paidAt">>> {
    const rows = await repositories.donations.listByUser(userId);
    return rows.map(({ id, amount, status, message, vnpTxnRef, vnpBankCode, vnpTransactionNo, createdAt, paidAt }) => ({
      id, amount, status, message, vnpTxnRef, vnpBankCode, vnpTransactionNo, createdAt, paidAt,
    }));
  },

  async getAdminStats(forceRefresh = false): Promise<DonationStats> {
    const now = Date.now();
    if (!forceRefresh && cachedStats && now - statsCachedAt < STATS_CACHE_TTL_MS) {
      return cachedStats;
    }
    const stats = await repositories.donations.getStats();
    cachedStats = stats;
    statsCachedAt = now;
    return stats;
  },

  /**
   * Danh sách lịch sử giao dịch ủng hộ cho quản trị viên (có phân trang & lọc)
   */
  async listAdminDonations(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DonationRecord[]; total: number }> {
    return repositories.donations.list(params);
  },

  /**
   * Danh sách người ủng hộ gần đây công khai (có RAM cache 30s)
   */
  async getRecentDonors(limit = 8, forceRefresh = false): Promise<PublicDonor[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      limit === 8 &&
      cachedRecentDonors &&
      now - recentDonorsCachedAt < RECENT_DONORS_CACHE_TTL_MS
    ) {
      return cachedRecentDonors;
    }
    const items = (await repositories.donations.getRecentSuccess(limit)).map(({ id, donorName, amount, paidAt }) => ({
      id, name: publicDonorName(donorName), amount, paidAt,
    }));
    if (limit === 8) {
      cachedRecentDonors = items;
      recentDonorsCachedAt = now;
    }
    return items;
  },
};

