import { NextResponse } from "next/server";
import { repositories } from "@database/repositories";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ txnRef: string }> }) {
  const { txnRef } = await context.params;
  if (!/^TROVIO(?:_|QR|SEPAY)[A-Fa-f0-9]{32}$/.test(txnRef)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const donation = await repositories.donations.getByTxnRef(txnRef);
  if (!donation) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, data: { status: donation.status, amount: donation.amount } }, {
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
