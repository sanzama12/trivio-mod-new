import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { CompareTabs } from "@/components/program/compare-tabs";

export const metadata: Metadata = { title: "So sánh chương trình" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "So sánh chương trình" }]} />
      <CompareTabs initial={tab === "ma-tran" ? "matrix" : "table"} />
    </div>
  );
}
