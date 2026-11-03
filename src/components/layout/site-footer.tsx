import Link from "next/link";
import { LuFacebook, LuLinkedin, LuMail, LuMapPin, LuPhone, LuYoutube } from "react-icons/lu";
import { Logo } from "./logo";

const cols = [
  {
    title: "Về hệ thống",
    links: [
      { label: "Giới thiệu chung", href: "/tro-giup" },
      { label: "Cách Trovio gợi ý", href: "/cach-goi-y" },
      { label: "Mốc tuyển sinh & nhắc hạn", href: "/moc-tuyen-sinh" },
      { label: "Ủng hộ dự án (VNPay)", href: "/ung-ho" },
      { label: "Trợ giúp & Liên hệ", href: "/tro-giup" },
    ],
  },
  {
    title: "Quy tắc gợi ý & Dữ liệu",
    links: [
      { label: "Thuật toán gợi ý", href: "/cach-goi-y" },
      { label: "Nguồn dữ liệu đề án", href: "/cach-goi-y#nguon-du-lieu" },
    ],
  },
  {
    title: "Điều khoản & Bảo mật",
    links: [
      { label: "Điều khoản sử dụng", href: "/dieu-khoan" },
      { label: "Chính sách bảo mật", href: "/chinh-sach-rieng-tu" },
      { label: "Quy trình giải quyết khiếu nại", href: "/tro-giup#lien-he" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="bg-slate-900 text-slate-400">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="white" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Hệ thống thông tin tuyển sinh và định hướng nghề nghiệp thông minh, minh bạch và hoàn toàn miễn phí cho học sinh Việt Nam.
          </p>
          <div className="mt-6 flex gap-3 text-slate-400">
            <a href="https://facebook.com" aria-label="Facebook" className="hover:text-white">
              <LuFacebook className="size-5" />
            </a>
            <a href="https://youtube.com" aria-label="YouTube" className="hover:text-white">
              <LuYoutube className="size-5" />
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-white">
              <LuLinkedin className="size-5" />
            </a>
          </div>
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
              <LuMail className="size-4 shrink-0 text-slate-500" />
              <span>hotro@trovio.vn</span>
            </li>
            <li className="flex items-center gap-2">
              <LuPhone className="size-4 shrink-0 text-slate-500" />
              <span>1900 6868 (8:00 - 17:30)</span>
            </li>
            <li className="flex items-start gap-2">
              <LuMapPin className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <span>Hà Nội & TP. Hồ Chí Minh</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Trovio. Nền tảng dữ liệu tuyển sinh mở.</p>
          <p>Dữ liệu chỉ mang tính chất tham khảo · Luôn đối chiếu đề án chính thức của trường.</p>
        </div>
      </div>
    </footer>
  );
}
