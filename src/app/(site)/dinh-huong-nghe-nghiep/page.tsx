import type { Metadata } from "next";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { CareerSurvey } from "@/components/catalog/career-survey";

export const metadata: Metadata = {
  title: "Khảo sát định hướng nghề nghiệp",
  description: "Trả lời vài câu hỏi về sở thích, lĩnh vực quan tâm và môn thế mạnh để nhận gợi ý ngành học.",
};

export default async function CareerSurveyPage() {
  const [groups, subjects] = await Promise.all([catalogService.getGroups(), catalogService.getSubjects()]);
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khảo sát định hướng nghề nghiệp" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Khảo sát định hướng nghề nghiệp</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Bốn bước ngắn, khoảng 2 phút. Trovio dùng câu trả lời để gợi ý ngành học liên quan. Đây không phải trắc nghiệm tính cách hay đánh giá năng lực.
      </p>
      <CareerSurvey groups={groups} subjects={subjects} />
    </div>
  );
}
