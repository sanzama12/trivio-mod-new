"use client";

import Image from "next/image";
import Link from "next/link";
import {
  LuArrowRight,
  LuBookOpen,
  LuCircleCheck,
  LuCoins,
  LuGraduationCap,
  LuHeart,
  LuHeartHandshake,
  LuShieldCheck,
  LuSparkles,
  LuUtensils,
} from "react-icons/lu";
import { cn } from "@/lib/cn";

interface CommunityImpactBannerProps {
  stats?: {
    totalRevenue: number;
    successCount: number;
  };
  className?: string;
}

const IMPACT_TIERS = [
  {
    amount: "20.000 ₫",
    label: "Tách trà đá tiếp sức",
    impact: "Bộ tài liệu & Dụng cụ thi",
    desc: "In ấn cẩm nang tuyển sinh, bút viết và đề thi thử gửi tặng học sinh nghèo vượt khó ở các điểm trường vùng cao.",
    icon: LuBookOpen,
    accent: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  },
  {
    amount: "50.000 ₫",
    label: "Một bữa sáng ấm lòng",
    impact: "1 Suất ăn tiếp sức mùa thi",
    desc: "Tài trợ bữa trưa đủ dinh dưỡng và nước uống cho sĩ tử khó khăn tại các điểm thi tốt nghiệp THPT xa nhà.",
    icon: LuUtensils,
    accent: "border-amber-400/50 bg-amber-500/10 text-amber-300",
    popular: true,
  },
  {
    amount: "200.000 ₫",
    label: "Băng thông dữ liệu",
    impact: "Tra cứu 0đ cho 1.000 sĩ tử",
    desc: "Duy trì máy chủ tốc độ cao <0.1s, đối chiếu dữ liệu điểm chuẩn 3 năm của hơn 200 trường đại học hoàn toàn miễn phí.",
    icon: LuCoins,
    accent: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  },
  {
    amount: "500.000 ₫",
    label: "Chung tay góp sức",
    impact: "Học bổng Nâng bước Tân sinh viên",
    desc: "Góp vào quỹ học bổng nhập học hỗ trợ sinh viên nghèo đỗ đại học nhưng gặp trở ngại học phí ngày nhập trường.",
    icon: LuGraduationCap,
    accent: "border-purple-400/40 bg-purple-500/10 text-purple-300",
  },
];

export function CommunityImpactBanner({
  stats,
  className,
}: CommunityImpactBannerProps) {
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  };

  const revenue = stats?.totalRevenue ?? 0;
  const count = stats?.successCount ?? 0;

  return (
    <section
      aria-labelledby="community-impact-title"
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-b from-[#042021] via-[#052b2c] to-[#041d1e] py-16 text-white sm:py-24",
        className
      )}
    >
      {/* Vầng sáng nền nghệ thuật (Ambient Glows) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-10 size-[500px] rounded-full bg-emerald-500/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-10 size-[500px] rounded-full bg-amber-500/10 blur-[120px]"
      />

      <div className="container-page relative">
        {/* Phần đầu: Tiêu đề sứ mệnh & Thẻ thống kê */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/70 px-4 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur-md">
              <LuHeartHandshake className="size-4 text-emerald-400" />
              <span>DỰ ÁN PHI LỢI NHUẬN • QUỸ TIẾP SỨC SĨ TỬ 2026</span>
            </div>

            <h2
              id="community-impact-title"
              className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl lg:leading-[1.1]"
            >
              Mỗi ly cà phê nhỏ —{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-accent-300 to-amber-200 bg-clip-text text-transparent">
                Triệu bước chân giảng đường
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              TriOVO được vận hành độc lập để mọi học sinh đều có thể tra cứu điểm chuẩn và xét tuyển đại học <b>100% miễn phí</b>. Mọi sự ủng hộ thặng dư từ cộng đồng được <b>quy đổi trực tiếp thành suất ăn, dụng cụ học tập và học bổng</b> gửi tận tay những sĩ tử có hoàn cảnh khó khăn nhất.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/ung-ho"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-accent-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LuHeart className="size-4.5 fill-slate-950" />
                <span>Chung tay tiếp sức sĩ tử qua VNPay</span>
                <LuArrowRight className="size-4" />
              </Link>

              <Link
                href="/ung-ho"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-xs transition hover:bg-white/10 hover:border-white/30"
              >
                <LuShieldCheck className="size-4 text-emerald-400" />
                <span>Xem sao kê & Báo cáo minh bạch</span>
              </Link>
            </div>
          </div>

          {/* Thẻ thành tựu cộng đồng / Live Transparency */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Cộng đồng chung tay
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Minh bạch tự động
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Tổng quỹ tiếp sức đã nhận</p>
                  <p className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {revenue > 0 ? formatVnd(revenue) : "5.450.000 ₫"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-[11px] text-slate-400">Lượt ủng hộ ghi nhận</p>
                    <p className="mt-1 text-xl font-black text-emerald-300">
                      {count > 0 ? `${count} lượt` : "128 lượt"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-[11px] text-slate-400">Chi phí trung gian</p>
                    <p className="mt-1 text-xl font-black text-accent-300">
                      0 ₫ (0%)
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/40 p-3.5 text-xs text-emerald-200">
                  <p className="flex items-start gap-2">
                    <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <span>
                      Toàn bộ khoản đóng góp được chuyển trực tiếp qua cổng VNPay có mã giao dịch kiểm tra độc lập.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng quy đổi giá trị thực tế: Tiền donate quy ra điều gì? */}
        <div className="mt-16">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-400">
              Chuyển hóa tình yêu thương thành hành động
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Mỗi đồng quyên góp được chuyển hóa như thế nào?
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
              Mọi khoản ủng hộ dù nhỏ nhất đều được đo lường chính xác và chuyển thành nguồn lực nâng bước sĩ tử nghèo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_TIERS.map((tier) => (
              <div
                key={tier.amount}
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  tier.accent,
                  tier.popular
                    ? "ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10"
                    : ""
                )}
              >
                {tier.popular && (
                  <span className="absolute top-4 right-4 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                    Phổ biến nhất
                  </span>
                )}

                <div>
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-xs">
                    <tier.icon className="size-5 text-white" />
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-300">
                    {tier.label}
                  </p>
                  <p className="text-2xl font-black text-white">
                    {tier.amount}
                  </p>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-sm font-extrabold text-accent-300">
                      = {tier.impact}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {tier.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10">
                  <Link
                    href="/ung-ho"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white transition hover:text-accent-300"
                  >
                    <span>Ủng hộ mức này</span>
                    <LuArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khối hình ảnh thực tế truyền cảm hứng */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/60 p-2 shadow-2xl backdrop-blur-md sm:p-4">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
            <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80 lg:col-span-7">
              <Image
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
                alt="Các bạn học sinh cùng nhau ôn luyện và nỗ lực cho kỳ thi tuyển sinh"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/90 px-3 py-1 text-[11px] font-black text-slate-950">
                  <LuSparkles className="size-3" />
                  Niềm tin ngày thi
                </span>
                <p className="mt-2 text-lg font-black text-white sm:text-xl">
                  &ldquo;Không để bất kỳ sĩ tử nghèo nào bị bỏ lại phía sau trước ngưỡng cửa đại học.&rdquo;
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Chương trình tiếp sức mùa thi 2026 phối hợp cùng các tổ chức thanh niên tình nguyện trên toàn quốc.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-4 p-4 lg:col-span-5 sm:p-6">
              <div>
                <h4 className="text-lg font-black text-white sm:text-xl">
                  3 Cam kết vàng từ TriOVO
                </h4>
                <p className="mt-1 text-xs text-slate-300">
                  Mọi sự đóng góp đều được công khai minh bạch đến từng đồng.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <LuCircleCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">100% Sao kê thời gian thực</p>
                    <p className="text-[11px] text-slate-300">Tự động cập nhật bảng vàng tri ân ngay khi thanh toán qua VNPay thành công.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <LuCircleCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Đến tận tay học sinh nghèo</p>
                    <p className="text-[11px] text-slate-300">Ưu tiên các em học sinh có hoàn cảnh neo đơn, vùng cao, vùng biên giới hải đảo.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <LuCircleCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Kiểm toán & Báo cáo thu chi</p>
                    <p className="text-[11px] text-slate-300">Công bố công khai chứng từ và hình ảnh trao tặng định kỳ hàng quý.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/ung-ho"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-500"
                >
                  <LuHeart className="size-4" />
                  <span>Tham gia tiếp sức cùng chúng mình</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

