import crypto from "node:crypto";

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  url: string;
  returnUrl: string;
}

export function getVnpayConfig(): VnpayConfig {
  const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
  return {
    tmnCode: process.env.VNPAY_TMN_CODE || "CGXZLS0Z",
    hashSecret: process.env.VNPAY_HASH_SECRET || "RAOCTPGSKOWEHJTXDDFN dynamic",
    url: process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: process.env.VNPAY_RETURN_URL || `${appUrl}/api/donations/vnpay-return`,
  };
}

/** Định dạng ngày YYYYMMDDHHmmss theo múi giờ Việt Nam (GMT+7) */
export function formatVnpayDate(date = new Date()): string {
  // Lấy thời gian GMT+7
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const Y = vnTime.getUTCFullYear();
  const M = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const D = String(vnTime.getUTCDate()).padStart(2, "0");
  const h = String(vnTime.getUTCHours()).padStart(2, "0");
  const m = String(vnTime.getUTCMinutes()).padStart(2, "0");
  const s = String(vnTime.getUTCSeconds()).padStart(2, "0");
  return `${Y}${M}${D}${h}${m}${s}`;
}

export interface BuildPaymentUrlParams {
  txnRef: string;
  amount: number; // VNĐ
  orderInfo: string;
  ipAddress?: string | null;
  bankCode?: string;
  returnUrl?: string;
}

/**
 * Xây dựng URL chuyển tiếp sang Cổng thanh toán VNPay chuẩn version 2.1.0
 */
export function buildVnpayPaymentUrl(params: BuildPaymentUrlParams): string {
  const config = getVnpayConfig();
  const dateStr = formatVnpayDate();

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_ReturnUrl: params.returnUrl || config.returnUrl,
    vnp_IpAddr: params.ipAddress || "127.0.0.1",
    vnp_CreateDate: dateStr,
  };

  if (params.bankCode && params.bankCode.trim()) {
    vnpParams.vnp_BankCode = params.bankCode.trim();
  }

  // Sắp xếp các tham số theo alphabet tăng dần
  const sortedKeys = Object.keys(vnpParams).sort();
  const searchParams = new URLSearchParams();
  const signDataParts: string[] = [];

  for (const key of sortedKeys) {
    const val = vnpParams[key];
    if (val !== undefined && val !== null && val.length > 0) {
      searchParams.set(key, val);
      // Chuẩn hóa signData: encodeURIComponent hoặc định dạng raw key=val
      signDataParts.push(`${key}=${encodeURIComponent(val)}`);
    }
  }

  const signData = signDataParts.join("&");
  const hmac = crypto.createHmac("sha512", config.hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  searchParams.set("vnp_SecureHash", secureHash);

  return `${config.url}?${searchParams.toString()}`;
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
  orderInfo: string;
}

/**
 * Xác thực chữ ký HMAC-SHA512 từ VNPay callback (Return URL hoặc IPN webhook)
 */
export function verifyVnpayCallback(
  queryParams: Record<string, string | string[] | undefined>
): VerifyVnpayResult {
  const config = getVnpayConfig();

  const cleanParams: Record<string, string> = {};
  let receivedHash = "";

  for (const [k, v] of Object.entries(queryParams)) {
    if (!k.startsWith("vnp_")) continue;
    const val = Array.isArray(v) ? v[0] : v;
    if (val === undefined || val === null) continue;

    if (k === "vnp_SecureHash") {
      receivedHash = val;
    } else if (k !== "vnp_SecureHashType") {
      cleanParams[k] = val;
    }
  }

  const sortedKeys = Object.keys(cleanParams).sort();
  const signDataParts: string[] = [];

  for (const key of sortedKeys) {
    const val = cleanParams[key];
    if (val !== undefined && val !== null && val.length > 0) {
      signDataParts.push(`${key}=${encodeURIComponent(val)}`);
    }
  }

  const signData = signDataParts.join("&");
  const hmac = crypto.createHmac("sha512", config.hashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const isValid =
    receivedHash.length > 0 &&
    calculatedHash.toLowerCase() === receivedHash.toLowerCase();

  const responseCode = cleanParams.vnp_ResponseCode || "99";
  const rawAmount = Number(cleanParams.vnp_Amount || 0);

  return {
    isValid,
    isSuccess: isValid && responseCode === "00",
    txnRef: cleanParams.vnp_TxnRef || "",
    amount: rawAmount ? Math.round(rawAmount / 100) : 0,
    transactionNo: cleanParams.vnp_TransactionNo || null,
    bankCode: cleanParams.vnp_BankCode || null,
    cardType: cleanParams.vnp_CardType || null,
    payDate: cleanParams.vnp_PayDate || null,
    responseCode,
    orderInfo: cleanParams.vnp_OrderInfo || "",
  };
}

