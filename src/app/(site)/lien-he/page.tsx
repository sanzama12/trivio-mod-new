import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LuArrowRight, LuArrowUpRight, LuBookOpen, LuCircleHelp, LuHandHeart, LuMail, LuMessageSquareText } from "react-icons/lu";
import { EnterpriseContactForm } from "@/components/contact/contact-form";
import { Breadcrumb } from "@/components/ui/misc";
import { siteContact } from "@/lib/site-contact";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Gửi câu hỏi hoặc góp ý về thông tin tuyển sinh và các công cụ của Trovio.",
};

export default function ContactPage() {
  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="contact-title">
      <div className="container-page">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Liên hệ" }]} />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>TROVIO / LIÊN HỆ</span>
          <h1 id="contact-title">Liên hệ với Trovio</h1>
          <span className={styles.heroRule} aria-hidden />
          <p>Câu hỏi về chọn ngành, thông tin tuyển sinh, tài khoản hay khoản ủng hộ đều bắt đầu từ đây.</p>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <div className="container-page">
        <nav className={styles.topicStrip} aria-label="Chủ đề liên hệ">
          <span><LuBookOpen aria-hidden /> Tuyển sinh & chọn ngành</span>
          <span><LuMessageSquareText aria-hidden /> Tài khoản & trải nghiệm</span>
          <span><LuHandHeart aria-hidden /> Ủng hộ & chuyển khoản</span>
        </nav>

        <div className={styles.mainGrid}>
          <section className={styles.formSection} aria-labelledby="message-title">
            <span className={styles.sectionKicker}>GỬI LỜI NHẮN</span>
            <h2 id="message-title">Chúng tôi có thể giúp gì cho bạn?</h2>
            <p className={styles.sectionIntro}>Chọn chủ đề phù hợp và mô tả vấn đề. Với giao dịch chuyển khoản, hãy ghi thêm mã tham chiếu để dễ đối chiếu.</p>
            {siteContact.demo ? <div className={styles.unavailable} role="status">
              <LuMail aria-hidden />
              <div>
                <strong>Kênh gửi email chưa được bật</strong>
                <p>Hiện hệ thống chưa có địa chỉ nhận thư hỗ trợ. Bạn có thể tra cứu hướng dẫn hoặc lịch sử ủng hộ ở các mục bên dưới.</p>
              </div>
            </div> : <EnterpriseContactForm />}
          </section>

          <aside className={styles.helpPanel} aria-labelledby="help-panel-title">
            <span className={styles.panelIcon}><LuCircleHelp aria-hidden /></span>
            <span className={styles.panelEyebrow}>TRUNG TÂM HỖ TRỢ</span>
            <h2 id="help-panel-title">Tìm lời giải trước khi gửi.</h2>
            <p>Các câu hỏi thường gặp về tra cứu, điểm số và tài khoản đã được tổng hợp tại một nơi.</p>
            <Link href="/tro-giup" className={styles.panelLink}>Xem trung tâm trợ giúp <LuArrowRight aria-hidden /></Link>
            <div className={styles.panelFoot}>
              <strong>Về khoản ủng hộ</strong>
              <span>Kiểm tra trạng thái giao dịch và mã tham chiếu trong lịch sử của bạn.</span>
            </div>
          </aside>
        </div>

        <section className={styles.channels} aria-labelledby="channels-title">
          <div className={styles.channelsHeading}>
            <span className={styles.sectionKicker}>CÁC KÊNH TRA CỨU</span>
            <h2 id="channels-title">Đến đúng nơi bạn cần</h2>
          </div>
          <div className={styles.channelGrid}>
            {siteContact.demo ? <Link href="/tro-giup" className={styles.channel}>
              <span className={styles.channelIcon}><LuCircleHelp aria-hidden /></span>
              <strong>Trung tâm trợ giúp</strong>
              <p>Hướng dẫn và câu trả lời cho các thắc mắc thường gặp.</p>
              <span className={styles.channelAction}>Xem hướng dẫn <LuArrowUpRight aria-hidden /></span>
            </Link> : <a href={`mailto:${siteContact.email}`} className={styles.channel}>
              <span className={styles.channelIcon}><LuMail aria-hidden /></span>
              <strong>Email hỗ trợ</strong>
              <p>{siteContact.email}</p>
              <span className={styles.channelAction}>Soạn email <LuArrowUpRight aria-hidden /></span>
            </a>}
            <Link href="/ung-ho/lich-su" className={styles.channel}>
              <span className={styles.channelIcon}><LuHandHeart aria-hidden /></span>
              <strong>Lịch sử ủng hộ</strong>
              <p>Kiểm tra giao dịch và lấy mã tham chiếu khi cần hỗ trợ.</p>
              <span className={styles.channelAction}>Xem giao dịch <LuArrowUpRight aria-hidden /></span>
            </Link>
            <Link href="/chuong-trinh" className={styles.channel}>
              <span className={styles.channelIcon}><LuBookOpen aria-hidden /></span>
              <strong>Thông tin tuyển sinh</strong>
              <p>Đối chiếu ngành, trường và chương trình trước khi đặt câu hỏi.</p>
              <span className={styles.channelAction}>Tra cứu chương trình <LuArrowUpRight aria-hidden /></span>
            </Link>
          </div>
        </section>

        <section className={styles.imageBand} aria-label="Khám phá ngành học">
          <Image src="/images/about/students-guidance.webp" alt="Học sinh cùng trao đổi về lựa chọn học tập" fill sizes="(max-width: 768px) 100vw, 1200px" className={styles.image} />
          <div className={styles.imageCopy}>
            <span>ĐỊNH HƯỚNG CÙNG TROVIO</span>
            <h2>Khám phá ngành học từ điều bạn quan tâm.</h2>
            <Link href="/nganh">Tìm ngành học <LuArrowRight aria-hidden /></Link>
          </div>
        </section>
      </div>
    </div>
  </div>;
}
