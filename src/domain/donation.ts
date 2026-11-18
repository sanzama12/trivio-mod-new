export type DonationPaymentMethod = "qr" | "vnpay" | "sepay";

export const ANONYMOUS_DONOR_NAME = "Người ủng hộ ẩn danh";

export function publicDonorName(raw: string): string {
  const name = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!name || name === ANONYMOUS_DONOR_NAME) return ANONYMOUS_DONOR_NAME;
  const words = name.split(" ");
  return words.map((word, index) => {
    const letters = Array.from(word);
    if (letters.length === 1) return "*";
    if (index > 0 && index < words.length - 1) return `${letters[0]}${"*".repeat(letters.length - 1)}`;
    return `${letters[0]}${"*".repeat(Math.max(1, letters.length - 2))}${letters.length > 2 ? letters.at(-1) : ""}`;
  }).join(" ");
}

export type DonationPaymentAvailability = Record<DonationPaymentMethod, boolean>;

export interface DonationPayment {
  donationId: string;
  txnRef: string;
  amount: number;
  paymentUrl: string;
  qrImageUrl: string;
  method: DonationPaymentMethod;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  transferContent?: string;
}
