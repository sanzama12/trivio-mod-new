import { siteContact } from "@/lib/site-contact";
import type { Metadata } from "next";
import Link from "next/link";
import { LuMail, LuPhone } from "react-icons/lu";
import { catalogService } from "@/services";
import { Card, SectionHeading } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { FaqSearch } from "@/components/help/faq-search";
import { RestartTourButton } from "@/components/tour/guided-tour";

export const metadata: Metadata = { title: "Trợ giúp & Liên hệ" };

export default async function HelpPage() {
  const faq = await catalogService.getFaqGroups();
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-slate-50">
        <div className="container-page pt-6 pb-10">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trợ giúp" }]} />
          <div className="mt-8 text-center">
            <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold tracking-wide text-white">Trung tâm trợ giúp Trovio</span>
            <h1 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">Bạn cần Trovio hỗ trợ gì?</h1>
            <div id="huong-dan" className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
              <span>Lần đầu dùng Trovio?</span>
              <RestartTourButton />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <SectionHeading title="Câu hỏi thường gặp" />
          <div className="mt-6">
            <FaqSearch groups={faq} />
          </div>
        </div>

        <section id="lien-he" className="mt-16">
          <SectionHeading title="Liên hệ hỗ trợ" />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <LuMail className="size-6 text-primary-600" aria-hidden />
              <h3 className="mt-3 font-bold">Gửi email hỗ trợ</h3>
              <p className="mt-1 text-sm text-slate-600">Gửi câu hỏi về dữ liệu hoặc tài khoản.</p>
              {siteContact.demo ? <p className="mt-3 text-sm text-slate-600">Kênh email hỗ trợ chưa được cấu hình.</p> : <a href={`mailto:${siteContact.email}`} className="mt-3 inline-block font-semibold text-primary-600 hover:underline">{siteContact.email}</a>}
            </Card>
{siteContact.phone && <Card className="p-6"><LuPhone className="size-6 text-primary-600" /><a href={`tel:${siteContact.phone}`}>{siteContact.phone}</a></Card>}
          </div>
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
