import type { Metadata } from "next";
import { LuShieldCheck } from "react-icons/lu";
import { SUS_QUESTIONS, SUS_ROLES } from "@/domain/sus";
import { Breadcrumb } from "@/components/ui/misc";
import { SusSurvey } from "@/components/help/sus-survey";

// Phiếu dùng cho buổi test người dùng — không cần xuất hiện trên công cụ tìm kiếm.
export const metadata: Metadata = { title: "Khảo sát trải nghiệm", robots: { index: false, follow: false } };

export default function SurveyPage() {
  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khảo sát trải nghiệm" }]} />
      <h1 className="mt-6 text-2xl font-bold tracking-tight md:text-[28px]">Bạn thấy Trovio dễ dùng đến đâu?</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        10 câu ngắn, khoảng 2 phút. Với mỗi câu, chọn mức độ đồng ý từ <strong>1 (Rất không đồng ý)</strong> đến <strong>5 (Rất đồng ý)</strong>. Hãy trả lời theo cảm nhận đầu tiên,
        không có đáp án đúng hay sai.
      </p>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-600">
        <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-700" aria-hidden />
        Phiếu ẩn danh: không gắn với tài khoản, không lưu địa chỉ IP.
      </p>
      <div className="mt-6">
        <SusSurvey questions={SUS_QUESTIONS} roles={SUS_ROLES} />
      </div>
      </div>
    </div>
  );
}
