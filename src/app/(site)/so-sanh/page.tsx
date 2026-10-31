import type { Metadata } from "next";
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
  const tab = typeof sp.tab === "string" && sp.tab === "chuong-trinh" ? "chuong-trinh" : "truong";
  const schools = await catalogService.listSchools();

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-20">
      <div className="container-page py-6 sm:py-8">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "So sánh" }]} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900">
              So sánh & Đối chiếu tuyển sinh
            </h1>
            <p className="mt-1 text-sm sm:text-base text-stone-600 max-w-2xl">
              Đặt các lựa chọn cạnh nhau để đối chiếu trực quan học phí, địa điểm, phương thức xét tuyển và xu hướng điểm chuẩn qua các năm giúp bạn quyết định chính xác.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <CompareTabsClient schools={schools} initialTab={tab} />
        </div>
      </div>
    </div>
  );
}
