import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { CompareView } from "@/components/program/compare-view";

export const metadata: Metadata = { title: "So sánh chương trình" };

export default function ComparePage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "So sánh chương trình" }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">So sánh chương trình đào tạo</h1>
          <p className="mt-1 text-sm text-slate-500">So sánh trực quan các chương trình bạn đang quan tâm để đưa ra quyết định tốt nhất.</p>
        </div>
      </div>
      <div className="mt-6"><CompareView /></div>
    </div>
  );
}
