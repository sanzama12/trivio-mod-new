import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { donationService } from "@/services/donation.service";
import { DonationsManager } from "@/components/admin/donations-manager";

export const metadata: Metadata = {
  title: "Giao dịch ủng hộ",
  robots: { index: false, follow: false },
};

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await adminPage("/quan-tri/ung-ho");
  const { status, q, page } = await searchParams;

  const pageNum = Math.max(1, Number(page || 1));
  const currentStatus = status || "all";
  const currentSearch = q || "";

  const [stats, listData] = await Promise.all([
    donationService.getAdminStats(),
    donationService.listAdminDonations({
      status: currentStatus,
      search: currentSearch,
      page: pageNum,
      limit: 25,
    }),
  ]);

  return (
    <>
      <AdminHeader
        title="Giao dịch ủng hộ & thống kê"
        crumb="Ủng hộ"
      />
      <AdminBody>
        <div className="mb-6">
          <p className="text-sm text-slate-600">
            Theo dõi dòng tiền ủng hộ trực tiếp từ cộng đồng học sinh, phụ huynh và đối tác qua cổng thanh toán quốc gia VNPay. Dữ liệu được đồng bộ và cập nhật theo thời gian thực (Real-time IPN Webhook).
          </p>
        </div>

        <DonationsManager
          initialStats={stats}
          initialItems={listData.items}
          initialTotal={listData.total}
          currentStatus={currentStatus}
          currentSearch={currentSearch}
        />
      </AdminBody>
    </>
  );
}

