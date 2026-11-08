import Link from "next/link";
import { LuMail, LuPhone } from "react-icons/lu";
import { siteContact } from "@/lib/site-contact";
import { Logo } from "./logo";

const cols = [
  {
    title: "Về hệ thống",
    links: [
      { label: "Cách Trovio gợi ý", href: "/cach-goi-y" },
      { label: "Trắc nghiệm sở thích", href: "/trac-nghiem" },
      { label: "Mốc tuyển sinh & nhắc hạn", href: "/moc-tuyen-sinh" },
      { label: "Ủng hộ dự án (VNPay)", href: "/ung-ho" },
      { label: "Trợ giúp & Liên hệ", href: "/tro-giup" },
    ],
  },
  {
    title: "Quy tắc gợi ý & Dữ liệu",
    links: [
      { label: "Nguồn dữ liệu đề án", href: "/cach-goi-y#nguon-du-lieu" },
    ],
  },
  {
    title: "Điều khoản & Bảo mật",
    links: [
      { label: "Điều khoản sử dụng", href: "/dieu-khoan" },
      { label: "Chính sách riêng tư", href: "/chinh-sach-rieng-tu" },
      { label: "Quy trình giải quyết khiếu nại", href: "/tro-giup#lien-he" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="bg-slate-900 pb-24 text-slate-400">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="white" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Hệ thống thông tin tuyển sinh và định hướng nghề nghiệp thông minh, minh bạch và hoàn toàn miễn phí cho học sinh Việt Nam.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 text-sm font-bold text-white">{c.title}</h2>
            <ul className="space-y-3 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-4 text-sm font-bold text-white">Liên hệ</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <LuMail className="size-4 shrink-0 text-slate-600" />
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>{siteContact.demo && <span className="block text-xs">(email demo của đồ án)</span>}
            </li>
{siteContact.phone && <li className="flex items-center gap-2"><LuPhone className="size-4" /><a href={`tel:${siteContact.phone}`}>{siteContact.phone}</a></li>}

          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Trovio. Nền tảng dữ liệu tuyển sinh mở.</p>
          <p>Dữ liệu chỉ mang tính chất tham khảo · Luôn đối chiếu đề án chính thức của trường.</p>
        </div>
      </div>
    </footer>
  );
}
