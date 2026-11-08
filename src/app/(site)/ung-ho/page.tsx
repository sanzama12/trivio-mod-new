import type { Metadata } from "next";
import Image from "next/image";
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
  title: "Ủng hộ Trovio",
  description:
    "Chung tay cùng Trovio duy trì nền tảng tra cứu tuyển sinh, điểm chuẩn đại học và hướng nghiệp hoàn toàn miễn phí cho học sinh.",
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
    <div className="min-h-screen bg-gradient-to-b from-primary-50/50 via-white to-slate-50 py-12 sm:py-16">
      <div className="container-page max-w-5xl">
        {/* Hero Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-xs">
            <LuSparkles className="size-3.5 text-primary-600" />
            Dự án cộng đồng giáo dục phi lợi nhuận
          </div>

          <h1 className="mt-4 text-slate-900 text-3xl md:text-4xl font-bold tracking-tight">
            Tiếp sức ước mơ giảng đường cùng{" "}
            <span className="text-primary-600">
              Trovio
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed text-slate-600 sm:text-lg">
            Mỗi đóng góp của bạn là nguồn động lực to lớn giúp đội ngũ duy trì hệ thống máy chủ, cập nhật liên tục đề án tuyển sinh và giữ nền tảng <b>100% miễn phí</b> cho mọi học sinh, đặc biệt là các em ở vùng sâu, vùng xa.
          </p>

          {stats.totalRevenue > 0 && (
            <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-xs">
              <div>
                Cộng đồng đã chung tay:{" "}
                <b className="font-bold text-primary-700">{formatVnd(stats.totalRevenue)}</b>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <b className="font-bold text-slate-900">{stats.successCount}</b> lượt ủng hộ
              </div>
            </div>
          )}
        </div>

        {/* Khung ảnh chiến dịch điện ảnh Tiếp sức mùa thi */}
        <div className="relative mt-10 h-64 sm:h-80 lg:h-96 w-full overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
          <Image
            src="/images/donate-hero.jpg"
            alt="Tiếp sức mùa thi Trovio - Học sinh Việt Nam"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/85 via-primary-900/25 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 shadow-md">
              <LuSparkles className="size-3.5" />
              Chung tay phát triển Trovio
            </span>
            <h2 className="mt-2.5 text-lg sm:text-3xl font-semibold text-white leading-tight">
              Duy trì công cụ định hướng miễn phí cho học sinh
            </h2>
            <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-slate-200">
              Mỗi đóng góp giúp duy trì máy chủ, cập nhật dữ liệu đề án và phát triển tính năng miễn phí cho học sinh.
            </p>
          </div>
        </div>

        {/* Form ủng hộ chính & Cam kết minh bạch */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
          <div id="donate-form" className="lg:col-span-7">
            <DonateForm />
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Cam kết của Trovio */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <LuShieldCheck className="size-5 text-emerald-600" />
                Mục đích sử dụng
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Duy trì hạ tầng Cloud:</b> Duy trì máy chủ cho nền tảng.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Chuẩn hoá dữ liệu Bộ GD&ĐT:</b> Cập nhật dữ liệu đề án tuyển sinh.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <b>Phát triển tính năng:</b> Cải thiện công cụ hướng nghiệp và xét tuyển.
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
                <p className="mt-4 text-xs text-slate-600">
                  Chưa có lượt ủng hộ nào. Hãy là người đầu tiên.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {recentDonors.map((donor) => (
                    <div key={donor.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {donor.donorName}
                        </span>
                        <span className="text-xs font-semibold text-primary-700">
                          {formatVnd(donor.amount)}
                        </span>
                      </div>
                      {donor.message && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-slate-600 italic">
                          <LuMessageSquare className="mt-0.5 size-3 shrink-0 text-slate-600" />
                          <span>"{donor.message}"</span>
                        </p>
                      )}
                      {donor.paidAt && (
                        <span className="mt-1 block text-xs text-slate-600">
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

        {/* Khối giới thiệu mục đích ủng hộ */}
        <div className="mt-16 overflow-hidden rounded-3xl shadow-xl">
          <CommunityImpactBanner stats={stats} />
        </div>
      </div>
    </div>
  );
}
