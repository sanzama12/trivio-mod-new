import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowRight, LuClock, LuCompass, LuListChecks, LuSmile } from "react-icons/lu";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { RIASEC_SOFT, RiasecLetter } from "@/components/riasec/riasec-pill";
import { riasecService } from "@/services";

export const metadata: Metadata = { title: "Trắc nghiệm sở thích nghề nghiệp RIASEC" };

const steps = (n: number) => [
  { title: "Trả lời câu hỏi", desc: `Đánh giá mức độ yêu thích của bạn với ${n} tình huống, hoạt động quen thuộc.` },
  { title: "Xem kết quả", desc: "Hệ thống tính điểm 6 nhóm RIASEC và tìm ra mã sở thích nổi trội của bạn." },
  { title: "Tìm ngành phù hợp", desc: "Nhận đề xuất ngành học, chương trình đào tạo chuẩn và các trường phù hợp." },
];

export default async function QuizIntroPage() {
  const n = (await riasecService.getQuestions()).length;
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm sở thích nghề nghiệp" }]} />
      <div className="mt-10 text-center">
        <span className="inline-flex rounded-full bg-accent-500 px-3 py-1 text-[11px] font-bold tracking-wider text-slate-900 uppercase">Định hướng sự nghiệp</span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">Khám phá sở thích nghề nghiệp của bạn</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Bài trắc nghiệm RIASEC (mô hình Holland) giúp bạn tìm hiểu mình thuộc nhóm sở thích nào, từ đó gợi ý ngành học phù hợp.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-4xl p-6 md:p-10">
        <h2 className="text-lg font-bold">6 nhóm sở thích nghề nghiệp</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RIASEC_ORDER.map((t) => (
            <div key={t} className={cn("rounded-xl border p-4", RIASEC_SOFT[t])}>
              <div className="flex items-center gap-2.5">
                <RiasecLetter type={t} />
                <span className="font-bold">{RIASEC_INFO[t].label}</span>
                <span className="text-xs">({RIASEC_INFO[t].name})</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{RIASEC_INFO[t].desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 border-t border-slate-100 pt-8 sm:grid-cols-3">
          {[
            { icon: LuListChecks, t: `${n} câu hỏi`, d: "Tình huống đời thường, dễ hình dung" },
            { icon: LuClock, t: "7 – 10 phút", d: "Làm nhanh mọi lúc, tự lưu tiến độ" },
            { icon: LuSmile, t: "Không có đáp án đúng/sai", d: "Chọn theo cảm nhận thật" },
          ].map((x) => (
            <div key={x.t} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <x.icon className="size-6 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="text-sm font-bold">{x.t}</p>
                <p className="text-xs text-slate-500">{x.d}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-bold">Cách thức hoạt động</h2>
        <ol className="mt-4 grid gap-6 md:grid-cols-3">
          {steps(n).map((s, i) => (
            <li key={s.title}>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">{i + 1}</span>
                <span className="text-sm font-bold tracking-wide text-primary-700 uppercase">{s.title}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-slate-100 pt-8 text-center">
          <Link href="/trac-nghiem/lam-bai" className={buttonClass({ size: "lg", className: "px-10" })}>
            Bắt đầu làm bài <LuArrowRight className="size-5" aria-hidden />
          </Link>
          <Link href="/chuong-trinh" className="text-sm font-semibold text-primary-600 underline-offset-4 hover:underline">
            Bạn có thể bỏ qua bài test và vào thẳng tìm chương trình
          </Link>
          <p className="mt-2 text-xs text-slate-500">Kết quả mang tính tham khảo, không định nghĩa khả năng hay tính cách của bạn.</p>
        </div>
      </Card>

      <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <LuCompass className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">Mini-test Phong cách làm việc</h2>
          <p className="text-[13px] text-slate-600">
            12 tình huống, khoảng 2 phút: làm nhóm hay một mình, ổn định hay thay đổi… Chỉ để giải thích thêm cho gợi ý, không tính điểm. Có thể nhập mã MBTI nếu đã biết.
          </p>
        </div>
        <Link href="/trac-nghiem/phong-cach" className={buttonClass({ variant: "outline" })}>
          Làm mini-test <LuArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
