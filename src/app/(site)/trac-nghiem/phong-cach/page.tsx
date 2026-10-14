import type { Metadata } from "next";
import { WorkStyleView } from "@/components/work-style/work-style-view";

export const metadata: Metadata = {
  title: "Mini-test Phong cách làm việc",
  description:
    "12 tình huống, khoảng 2 phút: bạn thích làm nhóm hay một mình, ổn định hay thay đổi, thực hành hay máy tính, chi tiết hay ý tưởng. Kết quả chỉ để tham khảo.",
};

export default function WorkStylePage() {
  return <WorkStyleView />;
}
