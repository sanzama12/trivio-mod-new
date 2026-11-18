import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { RiasecQuiz } from "@/components/quiz/riasec-quiz";
import { catalogService } from "@/services/catalog.service";
import { riasecForGroup } from "@/services/major-mapping.service";
import type { RiasecStudyGroup } from "@/domain/riasec-guidance";

export const metadata: Metadata = {
  title: "Trắc nghiệm Holland RIASEC",
  description: "Khám phá sáu nhóm sở thích nghề nghiệp Holland RIASEC và nhận gợi ý ngành học từ kết quả của bạn.",
};

export default async function RiasecPage() {
  const groups: RiasecStudyGroup[] = (await catalogService.getGroups()).flatMap((group) => {
    const riasec = riasecForGroup(group.id);
    return riasec ? [{ id: group.id, name: group.name, riasec }] : [];
  });
  return (
    <div className="bg-paper-50 pb-16">
      <div className="container-page py-6 md:py-9">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm RIASEC" }]} />
        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Bạn hứng thú với điều gì?</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">Đánh giá mức hứng thú với 60 hoạt động theo Holland RIASEC. Kết quả gợi ý nhóm ngành để bạn tìm hiểu thêm.</p>
        </header>
        <RiasecQuiz groups={groups} />
      </div>
    </div>
  );
}
