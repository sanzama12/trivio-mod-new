import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { SavedView } from "@/components/program/saved-view";

export const metadata: Metadata = { title: "Lựa chọn của tôi" };

export default function SavedPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Lựa chọn của tôi" }]} />
      <SavedView />
    </div>
  );
}
