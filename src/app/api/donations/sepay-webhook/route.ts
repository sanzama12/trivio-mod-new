import { NextResponse } from "next/server";
import { donationService, DonationValidationError } from "@/services/donation.service";
import { verifySepayAuthorization } from "@/services/donation-payment.service";
import { jsonBody } from "@/lib/http";

export async function POST(request: Request) {
  if (!verifySepayAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const { body, error } = await jsonBody<Record<string, unknown>>(request);
  if (error) return error;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  try {
    await donationService.processSepayWebhook(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof DonationValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("[SePay webhook]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
