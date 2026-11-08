import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { catalogService } from "@/services";
import { SavedView } from "@/components/program/saved-view";

export const metadata: Metadata = { title: "Đã lưu & nguyện vọng" };

export default async function SavedPage() {
  const schools = await catalogService.listSchools();
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Đã lưu & nguyện vọng" }]} />
      <SavedView schools={schools} />
    </div>
  );
}
