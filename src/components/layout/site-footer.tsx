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
      { label: "Tính tổng chi phí học", href: "/chi-phi" },
      { label: "Trợ giúp & Liên hệ", href: "/tro-giup" },
    ],
  },
  {
    title: "Quy tắc gợi ý & Dữ liệu",
    links: [
      { label: "Thuật toán gợi ý", href: "/cach-goi-y" },
      { label: "Nguồn dữ liệu đề án", href: "/cach-goi-y#nguon-du-lieu" },
      { label: "Việc làm & thu nhập theo ngành", href: "/viec-lam" },
      { label: "Báo dữ liệu sai", href: "/tro-giup#bao-loi" },
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

/** Công cụ mới (10/2026) — một hàng riêng để giữ nguyên bố cục 4 cột như thiết kế Figma. */
const tools = [
  { label: "Gợi ý dành cho bạn", href: "/goi-y" },
  { label: "Mùa điểm & Plan B", href: "/mua-diem" },
  { label: "Chọn môn lớp 10", href: "/chon-mon" },
  { label: "Ma trận quyết định", href: "/so-sanh?tab=ma-tran" },
  { label: "Học bổng & vay vốn", href: "/chi-phi#ho-tro" },
  { label: "Kênh giáo viên", href: "/lop-hoc" },
  { label: "Phản hồi sau 1 năm học", href: "/phan-hoi-nganh" },
  { label: "Bản nhẹ cho mạng yếu", href: "/nhe" },
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
          <h3 className="mb-4 text-sm font-bold text-white">Liên hệ hỗ trợ</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <LuMail className="size-4 shrink-0" aria-hidden />
              <a href="mailto:support@trovio.vn" className="hover:text-white">
                support@trovio.vn
              </a>
            </li>
            <li className="flex items-center gap-2">
              <LuPhone className="size-4 shrink-0" aria-hidden /> 1900 8198 (8:00 – 18:00)
            </li>
            <li className="flex gap-2 text-[13px] leading-relaxed">
              <LuMapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              Tầng 5, Tòa nhà Innovation, Công viên phần mềm Quang Trung, Quận 12, TP. Hồ Chí Minh
            </li>
          </ul>
        </div>
      </div>
      <nav aria-label="Công cụ" className="container-page -mt-4 pb-8">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <li className="font-bold text-white">Công cụ:</li>
          {tools.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="hover:text-white">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-800">
        <div className="container-page flex flex-col gap-4 py-6 text-[13px] md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 Trovio. Bản demo — số liệu điểm chuẩn, học phí là <strong className="font-semibold text-slate-300">dữ liệu minh hoạ</strong>, không dùng để đăng ký nguyện vọng.
          </p>
          <div className="flex items-center gap-2">
            <a href="https://facebook.com" aria-label="Facebook" className="-m-2 flex size-10 items-center justify-center rounded-lg hover:text-white">
              <LuFacebook className="size-5" aria-hidden />
            </a>
            <a href="https://youtube.com" aria-label="YouTube" className="-m-2 flex size-10 items-center justify-center rounded-lg hover:text-white">
              <LuYoutube className="size-5" aria-hidden />
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="-m-2 flex size-10 items-center justify-center rounded-lg hover:text-white">
              <LuLinkedin className="size-5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
