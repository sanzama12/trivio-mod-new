import type { Metadata } from "next";
import { LuChartColumn, LuShieldCheck } from "react-icons/lu";
import { getCurrentUser } from "@/lib/auth";
import { programService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { OutcomeSurveyForm } from "@/components/survey/outcome-survey-form";

export const metadata: Metadata = { title: "Phản hồi sau 1 năm học" };

type Props = { searchParams: Promise<{ ct?: string }> };

export default async function OutcomeSurveyPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const { ct } = await searchParams;
  const views = await programService.listAll();
  const options = views
    .map((v) => ({ id: v.program.id, slug: v.program.slug, label: `${v.program.name} – ${v.school.shortName}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  const initial = options.find((o) => o.slug === ct)?.id ?? "";
  const year = new Date().getFullYear();

  return (
    <div className="container-page max-w-4xl py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Phản hồi sau 1 năm học" }]} />
      <p className="mt-4 flex items-center gap-2 text-xs font-bold tracking-wider text-primary-600 uppercase">
        <LuChartColumn className="size-4" aria-hidden /> Khảo sát 1 phút
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">Một năm trước bạn đã chọn ngành. Giờ thấy sao?</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
        Câu trả lời của bạn giúp các em lớp 12 năm sau biết “người đi trước nói gì” và giúp Trovio kiểm tra gợi ý có đúng không.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        {user ? (
          <OutcomeSurveyForm options={options} initialProgramId={initial} cohorts={[year - 1, year - 2, year - 3, year]} />
        ) : (
          <Card className="p-6">
            <h2 className="text-lg font-bold">Đăng nhập để gửi phản hồi</h2>
            <p className="mt-1.5 text-sm text-slate-600">Mỗi tài khoản gửi 1 lần cho mỗi chương trình, để số liệu không bị trùng.</p>
            <ButtonLink href={`/dang-nhap?next=${encodeURIComponent(`/phan-hoi-nganh${initial ? `?ct=${ct}` : ""}`)}`} className="mt-4">
              Đăng nhập
            </ButtonLink>
          </Card>
        )}
        <Card className="h-fit border-l-4 border-l-success-500 p-5 text-[13px] text-slate-600">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <LuShieldCheck className="size-4 text-success-700" aria-hidden /> Cách Trovio dùng phản hồi
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-4">
            <li>Không hiện tên hay email của bạn.</li>
            <li>Chỉ công bố tỉ lệ khi một chương trình có từ 20 phản hồi.</li>
            <li>Lời nhắn được lọc thông tin liên hệ, quảng cáo và ngôn từ không phù hợp trước khi hiện.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
