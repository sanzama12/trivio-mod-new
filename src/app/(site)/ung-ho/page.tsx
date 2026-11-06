import type { Metadata } from "next";
import Link from "next/link";
import {
  LuCircleCheck,
  LuHandHeart,
  LuHeart,
  LuMessageSquare,
  LuShieldCheck,
  LuSparkles,
  LuUsers,
} from "react-icons/lu";
import { DonateForm } from "@/components/donate/donate-form";
import { CommunityImpactBanner } from "@/components/donate/community-impact-banner";
import { donationService } from "@/services/donation.service";

export const metadata: Metadata = {
  title: "Ủng hộ Dự án TriOVO — Tiếp sức sĩ tử Việt Nam",
  description:
    "Chung tay cùng TriOVO duy trì nền tảng tra cứu tuyển sinh, điểm chuẩn đại học và hướng nghiệp hoàn toàn miễn phí cho hơn 1 triệu học sinh trên cả nước.",
};

export default async function DonatePage() {
  const [recentDonors, stats] = await Promise.all([
    donationService.getRecentDonors(10),
    donationService.getAdminStats(),
  ]);

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-slate-50 py-12 sm:py-16">
      <div className="container-page max-w-5xl">
        {/* Hero Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold text-primary-700 shadow-xs">
            <LuSparkles className="size-3.5 text-primary-600" />
            Dự án cộng đồng giáo dục phi lợi nhuận
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Tiếp sức ước mơ giảng đường cùng{" "}
            <span className="bg-gradient-to-r from-primary-600 to-sky-600 bg-clip-text text-transparent">
              TriOVO
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Mỗi đóng góp của bạn là nguồn động lực to lớn giúp đội ngũ duy trì hệ thống máy chủ, cập nhật liên tục đề án tuyển sinh và giữ nền tảng <b>100% miễn phí</b> cho mọi học sinh, đặc biệt là các em ở vùng sâu, vùng xa.
          </p>

          {stats.totalRevenue > 0 && (
            <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-xs">
              <div>
                Cộng đồng đã chung tay:{" "}
                <b className="font-extrabold text-primary-700">{formatVnd(stats.totalRevenue)}</b>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <b className="font-bold text-slate-900">{stats.successCount}</b> lượt ủng hộ
              </div>
            </div>
          )}
        </div>

        {/* Form ủng hộ chính & Cam kết minh bạch */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <DonateForm />
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Cam kết của TriOVO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <LuShieldCheck className="size-5 text-emerald-600" />
                Cam kết minh bạch 100%
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Duy trì hạ tầng Cloud:</b> Đảm bảo website hoạt động ổn định, tốc độ dưới 0.1s trong các đợt cao điểm tra cứu điểm thi.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Chuẩn hoá dữ liệu Bộ GD&ĐT:</b> Tổng hợp và đối chiếu điểm chuẩn từ hơn 200 trường đại học và học viện.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Phát triển AI định hướng:</b> Nâng cấp trợ lý AI giúp tư vấn chọn ngành, tính toán tổ hợp xét tuyển thông minh.
                  </span>
                </li>
              </ul>
            </div>

            {/* Bảng vinh danh nhà hảo tâm gần đây */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <LuHandHeart className="size-5 text-primary-600" />
                Nhà hảo tâm mới nhất
              </h3>

              {recentDonors.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">
                  Hãy là một trong những người đầu tiên tiếp sức cho các sĩ tử hôm nay!
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {recentDonors.map((donor) => (
                    <div key={donor.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {donor.donorName}
                        </span>
                        <span className="text-xs font-bold text-primary-700">
                          {formatVnd(donor.amount)}
                        </span>
                      </div>
                      {donor.message && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-slate-600 italic">
                          <LuMessageSquare className="mt-0.5 size-3 shrink-0 text-slate-400" />
                          <span>"{donor.message}"</span>
                        </p>
                      )}
                      {donor.paidAt && (
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {new Date(donor.paidAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Khối Banner tác động xã hội & Quy đổi giúp đỡ sĩ tử nghèo */}
        <div className="mt-16 overflow-hidden rounded-3xl shadow-xl">
          <CommunityImpactBanner stats={stats} />
        </div>
      </div>
    </div>
  );
}
