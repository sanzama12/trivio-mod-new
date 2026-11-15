import type { Metadata } from "next";
import {
  LuBuilding2,
  LuMail,
  LuMapPin,
  LuMessageSquareText,
  LuPhone,
  LuShieldCheck,
} from "react-icons/lu";
import { Reveal } from "@/components/about/about-banner-center";
import { EnterpriseContactForm } from "@/components/contact/contact-form";
import { Breadcrumb } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Liên hệ",
  description:
    "Cổng tiếp nhận thông tin hợp tác, ký kết đề án tuyển sinh số và hỗ trợ học sinh – phụ huynh của Công ty Cổ phần Công nghệ & Giáo dục Trovio.",
};

/* Port từ mona.media/lien-he (.fcts-mid): 3 thẻ kênh, mỗi thẻ một màu riêng,
 * hover translateY(-.5rem), nhãn "phong cách" kèm chấm tròn màu.
 * Đổi: Zalo/hotline/email, màu teal/vàng/dạ quang của Trovio. */
const channels = [
  {
    href: "tel:19006868",
    icon: LuPhone,
    bg: "bg-primary-700",
    dot: "var(--color-primary-600)",
    style: "Phong cách trực tiếp",
    text: "Gọi tổng đài\n1900 6868",
    sub: "08:00 – 18:00 (T2 – T6)",
  },
  {
    href: "mailto:hotro@trovio.vn",
    icon: LuMail,
    bg: "bg-accent-500",
    dot: "var(--color-accent-500)",
    style: "Phong cách trang trọng",
    text: "Email chính thức\nhotro@trovio.vn",
    sub: "Phản hồi văn bản 4 – 8 giờ",
  },
  {
    href: "mailto:trogiup@trovio.vn",
    icon: LuMessageSquareText,
    bg: "bg-primary-900",
    dot: "var(--color-primary-900)",
    style: "Phong cách nhanh",
    text: "Hỏi trợ lý Trovio\ntrogiup@trovio.vn",
    sub: "Trả lời tự kiểm chứng nguồn",
  },
] as const;

const locations = [
  {
    city: "Hà Nội",
    type: "Trụ sở chính & Trung tâm R&D",
    address: "Tòa nhà Công nghệ Trovio Tower, Khu Công nghệ cao Duy Tân, Quận Cầu Giấy, TP. Hà Nội",
    email: "hanoi@trovio.vn",
  },
  {
    city: "TP. Hồ Chí Minh",
    type: "Chi nhánh miền Nam & Hợp tác doanh nghiệp",
    address: "Trovio Innovation Hub, Đường Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    email: "hcm@trovio.vn",
  },
] as const;

/* Header kiểu .about-title của dungmori: box label viền 2px chừa đáy + title gạch trên */
function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <header className="flex flex-col items-center">
      <div className="border-2 border-slate-900 border-b-0 bg-paper-50 px-3 py-0.5 text-lg font-bold tracking-wide text-slate-900">{label}</div>
      <div className="w-full border-t-2 border-slate-900 pt-4">
        <h2 className="text-center text-2xl font-bold tracking-[-.02em] text-slate-900 uppercase sm:text-4xl">{title}</h2>
      </div>
    </header>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper-50">
      <div className="container-page min-w-0 py-6">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Liên hệ" }]} />

        <Reveal>
          <header className="mt-6 pb-2 text-center">
            <p className="inline-flex bg-accent-500 px-3 py-1 text-xs font-black tracking-wide text-slate-950 uppercase">Kết nối với Trovio</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Liên hệ ngay với chúng tôi</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Chọn bất kỳ kênh nào bạn thấy thoải mái nhất — doanh nghiệp hợp tác, kỹ thuật tích hợp hay học sinh cần định hướng.
            </p>
          </header>
        </Reveal>

        <Reveal>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            {/* Trái — kênh liên hệ + địa chỉ (fcts-left của mona) */}
            <div className="min-w-0">
              <div className="space-y-4">
                {channels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <a
                      key={ch.href + ch.text}
                      href={ch.href}
                      className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 text-white shadow-sm sm:px-8 sm:py-6 transition-transform duration-300 hover:-translate-y-2"
                      style={{ backgroundColor: undefined }}
                    >
                      <span className={`${ch.bg} flex items-center justify-between gap-4 rounded-2xl px-6 py-5 sm:px-8 sm:py-6 w-full transition-transform duration-300 hover:-translate-y-0`}>
                        <span>
                          <span className="text-[11px] font-bold tracking-[.14em] uppercase opacity-80">{ch.style}</span>
                          <span className="mt-1 block text-lg leading-snug font-bold whitespace-pre-line sm:text-xl">{ch.text}</span>
                          <span className="mt-1 block text-xs opacity-80">{ch.sub}</span>
                        </span>
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:size-14">
                          <Icon className="size-6 sm:size-7" aria-hidden />
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>

              {/* fcts-top-add: địa chỉ + email + tổng đài */}
              <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <LuMapPin className="size-4 text-primary-700" aria-hidden /> Trụ sở & Văn phòng
                </h3>
                {locations.map((loc) => (
                  <div key={loc.city} className="border-t border-slate-100 pt-3 text-sm first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-extrabold text-slate-900">{loc.city}</span>
                      <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">{loc.type}</span>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-slate-600">{loc.address}</p>
                    <a href={`mailto:${loc.email}`} className="mt-0.5 inline-block font-bold text-primary-700 hover:underline">{loc.email}</a>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 text-sm">
                  <span className="font-medium text-slate-500">Tổng đài tiếp nhận: </span>
                  <a href="tel:19006868" className="font-black text-slate-900 hover:underline">1900 6868</a>
                </div>
              </div>
            </div>

            {/* Phải — form (fcts-right của mona) */}
            <div className="min-w-0">
              <div className="rounded-3xl border-2 border-slate-900 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 border-b border-slate-100 pb-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary-700 uppercase">
                    <LuBuilding2 className="size-3.5" aria-hidden /> Phiếu tiếp nhận
                  </span>
                  <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">Gửi đề xuất hoặc câu hỏi cho Trovio</h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">Thông tin được bảo mật theo cam kết NDA và chuyển thẳng tới bộ phận phụ trách.</p>
                </div>
                <EnterpriseContactForm />
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <LuShieldCheck className="size-4 text-primary-700" aria-hidden /> Cam kết với người liên hệ
                </h3>
                <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
                  <li className="flex items-start gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden /> Phản hồi văn bản và hồ sơ đề xuất trong <b>4 – 8 giờ làm việc</b>.</li>
                  <li className="flex items-start gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden /> Ký cam kết bảo mật (NDA) song phương trước khi tiếp nhận đề án chi tiết.</li>
                  <li className="flex items-start gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden /> Không thu thập số điện thoại của học sinh cho mục đích quảng cáo.</li>
                </ul>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                  Đơn vị pháp lý: <b>Công ty Cổ phần Công nghệ &amp; Giáo dục Trovio</b> (Trovio EduTech JSC). MST: 0110826926.
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Phòng ban chuyên trách — giữ dạng card cũ, đồng bộ style trang */}
        <Reveal>
          <section className="mt-16">
            <SectionTitle label="お問い合わせ" title="Đầu mối theo phòng ban" />
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
              Quý đối tác có thể liên hệ trực tiếp các khối nghiệp vụ chuyên biệt dưới đây.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { tag: "Khối Hợp tác", name: "Đối tác Đại học & Học viện", desc: "Ban Giám hiệu, Phòng Đào tạo & Tuyển sinh, Sở GD&ĐT.", email: "doitac@trovio.vn", phone: "1900 6868 (Nhánh 1)" },
                { tag: "Khối Kỹ thuật", name: "Tích hợp Dữ liệu & API", desc: "Chuẩn hoá đề án số, kết nối API điểm chuẩn, đồng bộ thời gian thực.", email: "tech@trovio.vn", phone: "1900 6868 (Nhánh 2)" },
                { tag: "Khối Truyền thông", name: "Quan hệ Báo chí & Sự kiện", desc: "Báo chí, bảo trợ truyền thông ngày hội hướng nghiệp, tài trợ học bổng.", email: "media@trovio.vn", phone: "1900 6868" },
                { tag: "Dịch vụ Học sinh", name: "Hỗ trợ Học sinh & Phụ huynh", desc: "Giải đáp điểm chuẩn, hướng dẫn tính điểm và trắc nghiệm RIASEC.", email: "hotro@trovio.vn", phone: "1900 6868 (Nhánh 3)" },
              ].map((dept) => (
                <article key={dept.email} className="flex min-h-56 flex-col justify-between rounded-[1.8rem] border border-dashed border-slate-400 bg-paper-50 p-5 text-center transition hover:border-primary-500 hover:shadow-lg">
                  <div>
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{dept.tag}</span>
                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900">{dept.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{dept.desc}</p>
                  </div>
                  <div className="mt-4 space-y-1 rounded-xl bg-white p-3 text-xs ring-1 ring-slate-100">
                    <a href={`mailto:${dept.email}`} className="block font-bold text-primary-700 hover:underline">{dept.email}</a>
                    <span className="block font-bold text-slate-900">{dept.phone}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
