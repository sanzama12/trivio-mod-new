import { NextResponse } from "next/server";
import { repositories } from "@database/repositories";
import { donationService } from "@/services/donation.service";
import { clientIp, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request, context: { params: Promise<{ txnRef: string }> }) {
  const { txnRef } = await context.params;
  if (!/^(?:(?:TQ|TS)[A-Fa-f0-9]{12}(?:[A-Fa-f0-9]{4})?|TROVIO(?:_|QR|SEPAY)[A-Fa-f0-9]{32})$/.test(txnRef)) {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }
  const wait = rateLimit(`donation:status:${clientIp(request)}`, 120, 60);
  if (wait) return tooMany(wait);
  const donation = await repositories.donations.getByTxnRef(txnRef);
  if (!donation) return NextResponse.json({ ok: false }, { status: 404, headers });
  const checked = await donationService.refreshQrPayment(donation);
  return NextResponse.json({ ok: true, data: { status: checked.donation.status, amount: checked.donation.amount, paidAt: checked.donation.paidAt, verificationUnavailable: checked.verificationUnavailable } }, {
    headers,
  });
}
