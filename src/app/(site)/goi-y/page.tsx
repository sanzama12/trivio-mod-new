import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { RecommendationsView } from "@/components/recommend/recommendations-view";

export const metadata: Metadata = { title: "Gợi ý dành cho bạn", description: "Gợi ý chương trình theo sở thích, điểm và mục tiêu — kèm lý do và cảnh báo khi lệch mục tiêu." };

export default function RecommendationsPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Gợi ý dành cho bạn" }]} />
      <RecommendationsView />
    </div>
  );
}
