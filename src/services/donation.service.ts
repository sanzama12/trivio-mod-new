import { repositories, type DonationRecord, type DonationStats } from "@database/repositories";
import { buildVnpayPaymentUrl, verifyVnpayCallback } from "./vnpay.service";
import { emailError } from "@/lib/email-validation";

export interface CreateDonationInput {
  amount: number;
  donorName?: string;
  donorEmail?: string;
  message?: string;
  bankCode?: string;
}

export interface CreateDonationResult {
  donationId: string;
  txnRef: string;
  paymentUrl: string;
  amount: number;
}

export class DonationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DonationValidationError";
  }
}

// In-memory cache để loại bỏ query chậm trên trang chủ và API public
let cachedStats: DonationStats | null = null;
let statsCachedAt = 0;
const STATS_CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

let cachedRecentDonors: Array<Pick<DonationRecord, "id" | "donorName" | "amount" | "message" | "paidAt">> | null = null;
let recentDonorsCachedAt = 0;
const RECENT_DONORS_CACHE_TTL_MS = 30 * 1000; // 30s cache TTL

export function invalidateDonationCache(): void {
  cachedStats = null;
  statsCachedAt = 0;
  cachedRecentDonors = null;
  recentDonorsCachedAt = 0;
}

export const donationService = {
  /**
   * Khởi tạo giao dịch ủng hộ và tạo link thanh toán VNPay
   */
  async createDonation(
    input: CreateDonationInput,
    clientIp?: string | null
  ): Promise<CreateDonationResult> {
    const rawAmount = Number(input.amount);
    if (!Number.isFinite(rawAmount) || rawAmount < 10000) {
      throw new DonationValidationError("Số tiền ủng hộ tối thiểu là 10.000 VNĐ.");
    }
    if (rawAmount > 100000000) {
      throw new DonationValidationError("Số tiền ủng hộ tối đa cho mỗi lượt là 100.000.000 VNĐ.");
    }
    const amount = Math.round(rawAmount);

    let donorName = (input.donorName || "").trim();
    if (!donorName) {
      donorName = "Nhà hảo tâm giấu tên";
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

    // Tạo mã tham chiếu giao dịch độc nhất: TROVIO_TIME_RANDOM
    const txnRef = `TROVIO_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const orderInfo = `Ung ho Trieu Nu Cuoi TriOVO - ${donorName}`;

    // Lưu bản ghi trạng thái pending vào cơ sở dữ liệu
    const donation = await repositories.donations.create({
      donorName,
      donorEmail,
      amount,
      message,
      orderInfo,
      vnpTxnRef: txnRef,
      ipAddress: clientIp ?? null,
    });

    // Tạo link thanh toán VNPay 2.1.0
    const paymentUrl = buildVnpayPaymentUrl({
      txnRef,
      amount,
      orderInfo,
      ipAddress: clientIp,
      bankCode: input.bankCode,
    });

    return {
      donationId: donation.id,
      txnRef,
      paymentUrl,
      amount,
    };
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

      return {
        success: verified.isSuccess,
        message: verified.isSuccess
          ? "Thanh toán ủng hộ thành công! Chân thành cảm ơn tấm lòng hảo tâm của bạn."
          : `Giao dịch chưa hoàn tất (Mã lỗi: ${verified.responseCode}).`,
        donation: updated ?? existing,
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
  async getRecentDonors(limit = 8, forceRefresh = false) {
    const now = Date.now();
    if (
      !forceRefresh &&
      limit === 8 &&
      cachedRecentDonors &&
      now - recentDonorsCachedAt < RECENT_DONORS_CACHE_TTL_MS
    ) {
      return cachedRecentDonors;
    }
    const items = await repositories.donations.getRecentSuccess(limit);
    if (limit === 8) {
      cachedRecentDonors = items;
      recentDonorsCachedAt = now;
    }
    return items;
  },
};

