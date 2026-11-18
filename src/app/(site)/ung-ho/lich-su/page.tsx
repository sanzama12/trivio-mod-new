import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { donationService } from "@/services/donation.service";
import { DonationHistory } from "@/components/donate/donation-history";

export const metadata: Metadata = { title: "Lịch sử ủng hộ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DonationHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=%2Fung-ho%2Flich-su");
  const items = await donationService.listForUser(user.id);
  return <DonationHistory initialItems={items} />;
}
