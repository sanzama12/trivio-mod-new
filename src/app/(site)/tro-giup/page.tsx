import type { Metadata } from "next";
import Link from "next/link";
import { LuMail, LuMessageCircle, LuPhone } from "react-icons/lu";
import { catalogService, programService } from "@/services";
import { getCurrentUser } from "@/lib/auth";
import { Card, SectionHeading } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { FaqSearch } from "@/components/help/faq-search";
import { ReportForm } from "@/components/help/report-form";
import { RestartTourButton } from "@/components/tour/guided-tour";

export const metadata: Metadata = { title: "Trợ giúp & Liên hệ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HelpPage({ searchParams }: Props) {
  const sp = await searchParams;
  const slug = typeof sp.ct === "string" ? sp.ct.slice(0, 120) : null;
  const [faq, user, view] = await Promise.all([catalogService.getFaqGroups(), getCurrentUser(), slug ? programService.getBySlug(slug) : Promise.resolve(null)]);
  const program = view ? { id: view.program.id, label: `${view.program.name} – ${view.school.shortName}` } : null;
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-slate-50">
        <div className="container-page pt-6 pb-10">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trợ giúp" }]} />
          <div className="mt-8 text-center">
            <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">Trung tâm trợ giúp Trovio</span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">Bạn cần Trovio hỗ trợ gì?</h1>
            <div id="huong-dan" className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
              <span>Lần đầu dùng Trovio?</span>
              <RestartTourButton />
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                |
              </span>
              <Link href="/nhe" className="font-semibold text-primary-700 hover:underline">
                Mạng yếu? Dùng bản nhẹ
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <SectionHeading title="Các câu hỏi thường gặp" subtitle="Bấm vào câu hỏi để xem câu trả lời." />
          <div className="mt-6">
            <FaqSearch groups={faq} />
          </div>
        </div>

        <section id="lien-he" className="mt-16">
          <SectionHeading title="Vẫn cần hỗ trợ trực tiếp từ ban biên tập?" subtitle="Kết nối với đội ngũ hỗ trợ của Trovio qua các kênh chính thức." />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Card className="p-6">
              <LuMail className="size-6 text-primary-600" aria-hidden />
              <h3 className="mt-3 font-bold">Gửi email hỗ trợ</h3>
              <p className="mt-1 text-sm text-slate-600">Nhận giải đáp chi tiết về cách dùng nền tảng, thắc mắc về dữ liệu.</p>
              <a href="mailto:support@trovio.vn" className="mt-3 inline-block font-semibold text-primary-600 hover:underline">
                support@trovio.vn
              </a>
            </Card>
            <Card className="p-6">
              <LuPhone className="size-6 text-primary-600" aria-hidden />
              <h3 className="mt-3 font-bold">Tổng đài tư vấn</h3>
              <p className="mt-1 text-sm text-slate-600">Hỗ trợ nhanh qua điện thoại trong giờ hành chính.</p>
              <a href="tel:19008198" className="mt-3 inline-block font-semibold text-slate-900">
                1900 8198 (8:00 – 18:00)
              </a>
            </Card>
            <Card className="p-6">
              <LuMessageCircle className="size-6 text-primary-600" aria-hidden />
              <h3 className="mt-3 font-bold">Khiếu nại & góp ý</h3>
              <p className="mt-1 text-sm text-slate-600">Phản hồi được ghi nhận và xử lý trong tối đa 5 ngày làm việc.</p>
              <a href="#bao-loi" className="mt-3 inline-block font-semibold text-primary-600 hover:underline">
                Dùng biểu mẫu bên dưới
              </a>
            </Card>
          </div>
        </section>

        <section id="bao-loi" className="mt-16">
          <Card className="p-6 md:p-8">
            <h2 className="text-xl font-bold">Báo dữ liệu sai</h2>
            <p className="mt-1 mb-6 text-sm text-slate-500">Cung cấp bằng chứng hoặc link nguồn để đội biên tập kiểm tra nhanh hơn.</p>
            <ReportForm program={program} signedInEmail={user?.verified ? user.email : null} />
          </Card>
        </section>

        <p className="mt-8 text-center text-sm text-slate-600">
          Đã dùng thử Trovio? Dành 2 phút cho{" "}
          <Link href="/khao-sat" className="font-semibold text-primary-700 hover:underline">
            khảo sát trải nghiệm (10 câu, ẩn danh)
          </Link>{" "}
          để giúp nhóm cải thiện.
        </p>
      </div>
    </>
  );
}
