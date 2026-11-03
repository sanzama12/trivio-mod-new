import { type NextRequest } from "next/server";
import { DonationController } from "@/controllers/donation.controller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return DonationController.handleVnpayReturn(req);
}

