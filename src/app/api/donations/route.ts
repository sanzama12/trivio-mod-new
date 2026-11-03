import { type NextRequest } from "next/server";
import { DonationController } from "@/controllers/donation.controller";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return DonationController.createDonation(req);
}

export async function GET(req: NextRequest) {
  return DonationController.getPublicDonors(req);
}

