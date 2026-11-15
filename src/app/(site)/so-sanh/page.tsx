import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/misc";
import { catalogService } from "@/services";
import { CompareTabsClient } from "@/components/compare/compare-tabs-client";

export const metadata: Metadata = {
  title: "So sánh trường đại học & chương trình đào tạo | Trovio",
  description:
    "So sánh trực quan từ 2 đến 4 trường đại học hoặc chương trình đào tạo theo học phí, địa điểm, phương thức tuyển sinh và biểu đồ điểm chuẩn qua các năm.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && sp.tab === "truong" ? "truong" : "chuong-trinh";
  const schools = await catalogService.listSchools();

  return (
    <div className="min-h-screen bg-[#fafaf6] pb-20">
      <div className="container-page min-w-0 py-6 md:py-10">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "So sánh" }]} />

        {/* Hero banner đặc trưng đồng bộ hệ thống */}
        <section className="relative isolate mt-4 overflow-hidden rounded-3xl bg-slate-950">
          <Image
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=75"
            alt="Sinh viên trao đổi thông tin chọn trường"
            fill
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="object-cover opacity-50"
            priority
          />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-primary-900/30" />
          <div className="relative px-5 py-8 sm:px-8 sm:py-10">
            <p className="inline-flex bg-accent-500 px-3 py-1 text-xs font-black tracking-wide text-slate-950 uppercase">
              CÔNG CỤ ĐỐI CHIẾU
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-black tracking-tight text-white md:text-5xl">
              So sánh & Đối chiếu tuyển sinh
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">
              Đặt các lựa chọn cạnh nhau để đối chiếu trực quan học phí, địa điểm, phương thức xét tuyển và xu hướng điểm chuẩn qua các năm.
            </p>
          </div>
        </section>

        <div className="mt-8">
          <CompareTabsClient schools={schools} initialTab={tab} />
        </div>
      </div>
    </div>
  );
}
