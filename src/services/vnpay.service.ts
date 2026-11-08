import crypto from "node:crypto";

/**
 * Cổng thanh toán VNPay — phiên bản API 2.1.0.
 *
 * Quy tắc ký theo tài liệu và code mẫu Node.js của VNPay:
 *  1. Bỏ tham số rỗng, bỏ vnp_SecureHash / vnp_SecureHashType.
 *  2. Sắp xếp khoá theo bảng chữ cái.
 *  3. Mã hoá từng giá trị bằng encodeURIComponent rồi đổi "%20" thành "+".
 *  4. Nối "khoá=giá_trị" bằng "&" → chuỗi này vừa là dữ liệu ký (HMAC-SHA512) vừa là query gửi đi.
 * Dùng cùng một hàm cho cả lúc tạo URL và lúc xác thực callback để hai phía luôn khớp.
 */

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  url: string;
  returnUrl: string;
}

export class VnpayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VnpayConfigError";
  }
}

const SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
/** Thời gian link thanh toán còn hiệu lực. */
export const VNPAY_EXPIRE_MINUTES = 15;

export function getVnpayConfig(): VnpayConfig {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim();
  if (!tmnCode || !hashSecret) {
    throw new VnpayConfigError("Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong biến môi trường.");
  }
  const appUrl = (process.env.APP_URL || "http://localhost:3001").trim().replace(/\/$/, "");
  return {
    tmnCode,
    hashSecret,
    url: process.env.VNPAY_URL?.trim() || SANDBOX_URL,
    returnUrl: process.env.VNPAY_RETURN_URL?.trim() || `${appUrl}/api/donations/vnpay-return`,
  };
}

export function isVnpayConfigured(): boolean {
  return !!process.env.VNPAY_TMN_CODE?.trim() && !!process.env.VNPAY_HASH_SECRET?.trim();
}

/** Định dạng ngày yyyyMMddHHmmss theo giờ Việt Nam (GMT+7), không phụ thuộc múi giờ máy chủ. */
export function formatVnpayDate(date = new Date()): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${vn.getUTCFullYear()}${p(vn.getUTCMonth() + 1)}${p(vn.getUTCDate())}${p(vn.getUTCHours())}${p(vn.getUTCMinutes())}${p(vn.getUTCSeconds())}`;
}

/**
 * VNPay yêu cầu vnp_OrderInfo là tiếng Việt không dấu, không ký tự đặc biệt.
 * Bỏ dấu, chỉ giữ chữ, số, khoảng trắng và vài ký tự an toàn; tối đa 255 ký tự.
 */
export function toVnpayOrderInfo(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9 _\-.:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
}

function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

/** Chuỗi "k=v&k=v" đã sắp xếp + mã hoá — dùng làm dữ liệu ký và query string. */
export function buildSignData(params: Record<string, string | undefined | null>): string {
  return Object.keys(params)
    .filter((k) => k !== "vnp_SecureHash" && k !== "vnp_SecureHashType")
    .filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]).length > 0)
    .sort()
    .map((k) => `${k}=${encodeValue(String(params[k]))}`)
    .join("&");
}

export function signVnpay(signData: string, hashSecret: string): string {
  return crypto.createHmac("sha512", hashSecret).update(Buffer.from(signData, "utf-8")).digest("hex");
}

export interface BuildPaymentUrlParams {
  txnRef: string;
  amount: number; // VNĐ
  orderInfo: string;
  ipAddress?: string | null;
  bankCode?: string;
  returnUrl?: string;
  now?: Date;
}

/** Tạo URL chuyển người dùng sang cổng VNPay. */
export function buildVnpayPaymentUrl(params: BuildPaymentUrlParams): string {
  const config = getVnpayConfig();
  const now = params.now ?? new Date();

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: toVnpayOrderInfo(params.orderInfo),
    vnp_OrderType: "other",
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_ReturnUrl: params.returnUrl || config.returnUrl,
    vnp_IpAddr: normalizeIp(params.ipAddress),
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(new Date(now.getTime() + VNPAY_EXPIRE_MINUTES * 60 * 1000)),
  };
  const bankCode = params.bankCode?.trim();
  if (bankCode && /^[A-Z0-9_]{2,20}$/.test(bankCode)) vnpParams.vnp_BankCode = bankCode;

  const signData = buildSignData(vnpParams);
  const secureHash = signVnpay(signData, config.hashSecret);
  return `${config.url}?${signData}&vnp_SecureHash=${secureHash}`;
}

/** VNPay chỉ nhận IPv4/IPv6 thuần; bỏ tiền tố IPv4-mapped "::ffff:". */
function normalizeIp(ip?: string | null): string {
  const value = (ip || "").trim().replace(/^::ffff:/, "");
  return value && value !== "unknown" ? value : "127.0.0.1";
}

export interface VerifyVnpayResult {
  isValid: boolean;
  isSuccess: boolean;
  txnRef: string;
  amount: number;
  transactionNo: string | null;
  bankCode: string | null;
  cardType: string | null;
  payDate: string | null;
  responseCode: string;
  transactionStatus: string | null;
  orderInfo: string;
}

/** Xác thực chữ ký HMAC-SHA512 của callback (Return URL hoặc IPN). */
export function verifyVnpayCallback(queryParams: Record<string, string | string[] | undefined>): VerifyVnpayResult {
  const config = getVnpayConfig();

  const clean: Record<string, string> = {};
  let receivedHash = "";
  for (const [k, v] of Object.entries(queryParams)) {
    if (!k.startsWith("vnp_")) continue;
    const val = Array.isArray(v) ? v[0] : v;
    if (val === undefined || val === null) continue;
    if (k === "vnp_SecureHash") receivedHash = String(val);
    else if (k !== "vnp_SecureHashType") clean[k] = String(val);
  }

  const expected = signVnpay(buildSignData(clean), config.hashSecret);
  const isValid = receivedHash.length === expected.length && safeEqualHex(expected, receivedHash.toLowerCase());

  const responseCode = clean.vnp_ResponseCode || "99";
  const transactionStatus = clean.vnp_TransactionStatus ?? null;
  const rawAmount = Number(clean.vnp_Amount || 0);

  return {
    isValid,
    // Thành công khi cả mã phản hồi và trạng thái giao dịch đều là "00" (TransactionStatus có thể vắng ở bản cũ).
    isSuccess: isValid && responseCode === "00" && (transactionStatus === null || transactionStatus === "00"),
    txnRef: clean.vnp_TxnRef || "",
    amount: Number.isFinite(rawAmount) && rawAmount > 0 ? Math.round(rawAmount / 100) : 0,
    transactionNo: clean.vnp_TransactionNo || null,
    bankCode: clean.vnp_BankCode || null,
    cardType: clean.vnp_CardType || null,
    payDate: /^\d{14}$/.test(clean.vnp_PayDate || "") ? clean.vnp_PayDate : null,
    responseCode,
    transactionStatus,
    orderInfo: clean.vnp_OrderInfo || "",
  };
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf-8");
  const bb = Buffer.from(b, "utf-8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Diễn giải mã vnp_ResponseCode cho người dùng (theo bảng mã của VNPay). */
export function describeVnpayResponse(code: string | null | undefined): string {
  switch (code) {
    case "00": return "Giao dịch thành công.";
    case "07": return "Đã trừ tiền nhưng giao dịch bị nghi ngờ gian lận. Vui lòng liên hệ ngân hàng.";
    case "09": return "Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking.";
    case "10": return "Xác thực thông tin thẻ/tài khoản sai quá 3 lần.";
    case "11": return "Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại.";
    case "12": return "Thẻ/tài khoản đang bị khoá.";
    case "13": return "Nhập sai mật khẩu xác thực giao dịch (OTP).";
    case "24": return "Bạn đã huỷ giao dịch.";
    case "51": return "Tài khoản không đủ số dư.";
    case "65": return "Tài khoản đã vượt hạn mức giao dịch trong ngày.";
    case "75": return "Ngân hàng thanh toán đang bảo trì.";
    case "79": return "Nhập sai mật khẩu thanh toán quá số lần quy định.";
    default: return "Giao dịch không thành công.";
  }
}
