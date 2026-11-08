/**
 * CONTROLLER LAYER — DonationController
 * Quản lý các endpoint liên quan đến ủng hộ qua VNPay và doanh thu quản trị
 */
import { NextResponse, type NextRequest } from "next/server";
import { donationService, DonationUnavailableError, DonationValidationError } from "@/services/donation.service";
import { requireAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/http";

export class DonationController {
  /**
   * Khởi tạo giao dịch ủng hộ và nhận link thanh toán VNPay
   * POST /api/donations
   */
  static async createDonation(req: NextRequest): Promise<Response> {
    try {
      const body = await req.json().catch(() => ({}));
      const ip = clientIp(req);

      const result = await donationService.createDonation(
        {
          amount: Number(body.amount),
          donorName: typeof body.donorName === "string" ? body.donorName : undefined,
          donorEmail: typeof body.donorEmail === "string" ? body.donorEmail : undefined,
          message: typeof body.message === "string" ? body.message : undefined,
          bankCode: typeof body.bankCode === "string" ? body.bankCode : undefined,
        },
        ip
      );

      return NextResponse.json({
        ok: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof DonationValidationError) {
        return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
      }
      if (err instanceof DonationUnavailableError) {
        console.error("[DonationController.createDonation] VNPay chưa được cấu hình (VNPAY_TMN_CODE / VNPAY_HASH_SECRET).");
        return NextResponse.json({ ok: false, message: err.message }, { status: 503 });
      }
      console.error("[DonationController.createDonation] Error:", err);
      return NextResponse.json(
        { ok: false, message: "Không thể tạo liên kết thanh toán. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }
  }

  /**
   * Xử lý callback khi người dùng hoàn tất thanh toán và được VNPay chuyển hướng về
   * GET /api/donations/vnpay-return
   */
  static async handleVnpayReturn(req: NextRequest): Promise<Response> {
    try {
      const searchParams = req.nextUrl.searchParams;
      const queryParams: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      const result = await donationService.processReturn(queryParams);

      // Trang kết quả tự đọc trạng thái từ database theo mã đơn — không đưa trạng thái/số tiền lên URL
      // để không ai giả được một biên lai "thành công".
      const baseRedirectUrl = new URL("/ung-ho/ket-qua", req.nextUrl.origin);
      if (result.donation) {
        baseRedirectUrl.searchParams.set("ref", result.donation.vnpTxnRef);
      } else {
        baseRedirectUrl.searchParams.set("loi", "xac-thuc");
      }

      return NextResponse.redirect(baseRedirectUrl);
    } catch (err) {
      console.error("[DonationController.handleVnpayReturn] Error:", err);
      const fallbackUrl = new URL("/ung-ho/ket-qua?loi=he-thong", req.nextUrl.origin);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  /**
   * Xử lý Webhook IPN từ máy chủ VNPay (server-to-server)
   * GET /api/donations/vnpay-ipn
   */
  static async handleVnpayIpn(req: NextRequest): Promise<Response> {
    try {
      const searchParams = req.nextUrl.searchParams;
      const queryParams: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      const ipnResult = await donationService.processIpn(queryParams);
      return NextResponse.json(ipnResult);
    } catch (err) {
      console.error("[DonationController.handleVnpayIpn] Error:", err);
      return NextResponse.json({ RspCode: "99", Message: "Unknown Error" });
    }
  }

  /**
   * Lấy danh sách ủng hộ công khai để vinh danh
   * GET /api/donations
   */
  static async getPublicDonors(req: NextRequest): Promise<Response> {
    const limit = Number(req.nextUrl.searchParams.get("limit") || 8);
    const donors = await donationService.getRecentDonors(limit);
    return NextResponse.json(
      { ok: true, data: donors },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  }

  /**
   * Lấy thống kê doanh thu và lịch sử giao dịch ủng hộ cho quản trị viên
   * GET /api/admin/donations
   */
  static async getAdminDonations(req: NextRequest): Promise<Response> {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));
    const status = sp.get("status") || "all";
    const search = sp.get("q") || sp.get("search") || undefined;

    const [stats, listData] = await Promise.all([
      donationService.getAdminStats(),
      donationService.listAdminDonations({ page, limit, status, search }),
    ]);

    return NextResponse.json({
      ok: true,
      stats,
      items: listData.items,
      total: listData.total,
      page,
      limit,
    });
  }
}

