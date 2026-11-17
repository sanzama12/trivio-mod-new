import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/misc";
import { RiasecQuiz } from "@/components/quiz/riasec-quiz";

export const metadata: Metadata = {
  title: "Trắc nghiệm Holland RIASEC",
  description: "Khám phá sáu nhóm sở thích nghề nghiệp Holland RIASEC và nhận gợi ý ngành học từ kết quả của bạn.",
};

export default function RiasecPage() {
  return (
    <div className="bg-paper-50 pb-16">
      <div className="container-page py-6 md:py-9">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm RIASEC" }]} />
        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Bạn hứng thú với điều gì?</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">Khám phá sở thích nghề nghiệp theo mô hình Holland RIASEC. Trả lời 60 hoạt động, khoảng 7–10 phút, để tìm các ngành học gần với bạn.</p>
        </header>
        <RiasecQuiz />
      </div>
    </div>
  );
}
