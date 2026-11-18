import type { Metadata } from "next";
import { LuMail } from "react-icons/lu";
import { EnterpriseContactForm } from "@/components/contact/contact-form";
import { Breadcrumb } from "@/components/ui/misc";
import { siteContact } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Gửi câu hỏi hoặc góp ý về thông tin tuyển sinh và các công cụ của Trovio.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      <div className="container-page py-6 md:py-10">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Liên hệ" }]} />
        <header className="mt-8 max-w-2xl">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">Liên hệ Trovio</h1>
          <p className="mt-3 text-slate-600">Gửi câu hỏi về ngành, trường, điểm chuẩn hoặc góp ý về Trovio.</p>
        </header>
        <div className={siteContact.demo ? "mt-8 max-w-2xl" : "mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"}>
          <section aria-labelledby="contact-email" className="border-t border-slate-200 pt-6">
            <h2 id="contact-email" className="text-lg font-bold text-slate-900">Gửi email</h2>
            {siteContact.demo ? (
              <p className="mt-3 text-sm text-slate-600">Kênh email hỗ trợ chưa được cấu hình.</p>
            ) : (
              <a href={`mailto:${siteContact.email}`} className="mt-4 inline-flex items-center gap-2 font-semibold text-primary-700 hover:underline">
                <LuMail className="size-5" aria-hidden /> {siteContact.email}
              </a>
            )}
          </section>
          {!siteContact.demo && <section aria-labelledby="contact-form" className="border-t border-slate-200 pt-6">
            <h2 id="contact-form" className="text-lg font-bold text-slate-900">Gửi yêu cầu</h2>
            <p className="mb-5 mt-2 text-sm text-slate-600">Điền thông tin để chúng tôi xem và phản hồi qua email.</p>
            <EnterpriseContactForm />
          </section>}
        </div>
      </div>
    </main>
  );
}
