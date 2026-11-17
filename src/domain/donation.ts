export type DonationPaymentMethod = "qr" | "vnpay" | "sepay";

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
