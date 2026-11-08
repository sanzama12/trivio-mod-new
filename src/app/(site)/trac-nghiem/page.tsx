import type { Metadata } from "next";
import { LuClock3, LuLockKeyhole, LuUserRoundCheck } from "react-icons/lu";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { RIASEC_QUESTIONS } from "@/domain/riasec-questions";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { QuizEntry } from "@/components/riasec/quiz-entry";
import { RIASEC_COLORS } from "@/components/riasec/riasec-pill";

export const metadata: Metadata = {
  title: "Trắc nghiệm sở thích nghề nghiệp RIASEC",
  description: "Khám phá 6 nhóm sở thích nghề nghiệp Holland qua những hoạt động gần gũi. Khoảng 7–10 phút, không cần đăng nhập, kết quả chỉ lưu trên trình duyệt của bạn.",
};

export default function QuizPage() {
  return (
    <div className="bg-paper-50 pb-16">
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page py-6 sm:py-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm sở thích" }]} />
          <div className="mt-8 max-w-3xl pb-4 sm:pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Bắt đầu chọn ngành từ điều bạn thích</h1>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-600">Trắc nghiệm RIASEC (Holland) giúp bạn nhận ra những hoạt động mình thích và các ngành đáng tìm hiểu. Bài này đo <strong className="font-semibold text-slate-900">sở thích</strong>, không đo năng lực hay tính cách cố định.</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><LuClock3 className="size-4 text-primary-600" aria-hidden />7–10 phút · {RIASEC_QUESTIONS.length} câu</li>
              <li className="flex items-center gap-2"><LuUserRoundCheck className="size-4 text-primary-600" aria-hidden />Không cần đăng nhập</li>
              <li className="flex items-center gap-2"><LuLockKeyhole className="size-4 text-primary-600" aria-hidden />Lưu trên trình duyệt này</li>
            </ul>
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-slate-600">Không hỏi ngày sinh hay cung hoàng đạo. Chọn mức độ yêu thích thật của bạn, kể cả khi chưa từng thử hoạt động đó. Bản nháp tự lưu để bạn có thể làm tiếp.</p>
            <div className="mt-7"><QuizEntry /></div>
          </div>
        </div>
      </section>
      <section className="container-page pt-10 sm:pt-12" aria-labelledby="riasec-groups-title">
        <h2 id="riasec-groups-title" className="text-2xl font-bold tracking-tight text-slate-900">Sáu nhóm sở thích, nhiều hướng khám phá</h2>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-600">Bạn có thể thích nhiều nhóm cùng lúc. Kết quả sẽ cho bạn mã ba chữ nổi bật cùng mức độ yêu thích của cả sáu nhóm.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RIASEC_ORDER.map((type) => (
            <Card key={type} className="p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className={`text-3xl font-bold ${RIASEC_COLORS[type].text}`}>{type}</span><h3 className="text-lg font-semibold text-slate-900">{RIASEC_INFO[type].label}</h3></div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{RIASEC_INFO[type].desc}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-slate-600">Kết quả là gợi mở để bạn tìm hiểu ngành, không quyết định bạn phải chọn nghề nào và không ảnh hưởng đến xếp hạng chương trình trên Trovio.</p>
      </section>
    </div>
  );
}
