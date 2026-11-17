import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBookOpen,
  LuChevronRight,
  LuHeart,
  LuMonitor,
  LuShieldCheck,
} from "react-icons/lu";
import { DonateForm } from "@/components/donate/donate-form";
import { donationService } from "@/services/donation.service";
import { getDonationPaymentAvailability } from "@/services/donation-payment.service";
import styles from "./donate.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ủng hộ Trovio",
  description: "Đồng hành cùng Trovio duy trì công cụ tra cứu tuyển sinh và khám phá ngành học miễn phí cho học sinh.",
};

const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

const purposes = [
  { icon: LuMonitor, title: "Vận hành nền tảng", detail: "Duy trì công cụ tra cứu và lưu nguyện vọng." },
  { icon: LuBookOpen, title: "Chăm sóc dữ liệu", detail: "Rà soát thông tin tuyển sinh để dễ đối chiếu hơn." },
  { icon: LuShieldCheck, title: "Cải thiện trải nghiệm", detail: "Làm các công cụ định hướng rõ ràng, dễ dùng hơn." },
];

export default async function DonatePage() {
  const donors = await donationService.getRecentDonors();
  const availability = getDonationPaymentAvailability();

  return (
    <div className={styles.page}>
      <div className="container-page">
        <nav className={styles.breadcrumb} aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <LuChevronRight aria-hidden />
          <span aria-current="page">Ủng hộ Trovio</span>
        </nav>
        <div className={styles.mainGrid}>
          <section className={styles.intro} aria-labelledby="donation-title">
            <span className={styles.eyebrow}><LuHeart aria-hidden /> CÙNG GIỮ TROVIO MỞ</span>
            <h1 id="donation-title">Ủng hộ<br /><span>Trovio.</span></h1>
            <p className={styles.lead}>
              Mỗi khoản đóng góp giúp Trovio tiếp tục phục vụ học sinh
              bằng các công cụ tra cứu và định hướng miễn phí.
            </p>
            <div className={styles.purposes}>
              <p>Sự đồng hành của bạn góp phần</p>
              <ul>
                {purposes.map(({ icon: Icon, title, detail }) => (
                  <li key={title}>
                    <Icon aria-hidden />
                    <span><strong>{title}</strong><small>{detail}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className={styles.checkout}>
            <DonateForm availability={availability} />
            <p className={styles.checkoutNote}>Đóng góp hoàn toàn tự nguyện. Vui lòng kiểm tra thông tin người nhận trước khi thanh toán.</p>
          </div>

          <figure className={styles.photo}>
            <Image
              src="/images/about/students-planning.webp"
              alt="Hai học sinh cùng xem thông tin học tập trên máy tính bảng tại khuôn viên trường"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1280px) 42vw, 520px"
              className={styles.photoImage}
            />
            <figcaption>Thông tin rõ hơn, lựa chọn tự tin hơn.</figcaption>
          </figure>
        </div>
      </div>

      <section className={styles.community} aria-labelledby="donation-thanks">
        <div className={`container-page ${styles.communityGrid}`}>
          <div className={styles.communityIntro}>
            <span className={styles.sectionLabel}>NHỮNG NGƯỜI ĐỒNG HÀNH</span>
            <h2 id="donation-thanks">Cảm ơn vì đã<br />đi cùng Trovio.</h2>
            <p>Chỉ những khoản đóng góp đã được xác nhận mới xuất hiện tại đây.</p>
            <Link href="/lien-he" className={styles.contactLink}>
              Đồng hành bằng cách khác <LuArrowUpRight aria-hidden />
            </Link>
          </div>
          <div className={styles.donors}>
            {donors.length ? (
              <ul aria-label="Đóng góp gần đây">
                {donors.map((donor) => (
                  <li key={donor.id}>
                    <span className={styles.donorInitial} aria-hidden>
                      {donor.donorName.trim().charAt(0).toLocaleUpperCase("vi-VN")}
                    </span>
                    <span className={styles.donorText}>
                      <strong>{donor.donorName}</strong>
                      {donor.message && <small>“{donor.message}”</small>}
                    </span>
                    <span className={styles.donorAmount}>{money(donor.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>Chưa có khoản đóng góp hoàn tất để hiển thị.</p>
            )}
          </div>
        </div>
      </section>

      <section className={`container-page ${styles.faq}`} aria-labelledby="donation-faq">
        <div className={styles.faqHeading}>
          <span className={styles.sectionLabel}>THÔNG TIN CẦN BIẾT</span>
          <h2 id="donation-faq">Câu hỏi thường gặp</h2>
          <p>Cần hỗ trợ thêm về một giao dịch? <Link href="/lien-he">Liên hệ Trovio <LuArrowRight aria-hidden /></Link></p>
        </div>
        <div className={styles.faqList}>
          <details>
            <summary>Ủng hộ ẩn danh được không?</summary>
            <p>Có. Bạn có thể chọn ẩn danh và bỏ trống tên. Khoản đóng góp được hiển thị dưới tên “Người ủng hộ ẩn danh”.</p>
          </details>
          <details>
            <summary>Khi nào giao dịch được xác nhận?</summary>
            <p>Trạng thái sẽ cập nhật khi hệ thống nhận xác nhận từ VNPAY hoặc SePay. Với chuyển khoản QR, hệ thống ghi nhận sau khi đối soát.</p>
          </details>
          <details>
            <summary>Có thể góp ý thay vì đóng góp không?</summary>
            <p>Có. Bạn có thể báo dữ liệu cần cập nhật hoặc gửi góp ý qua <Link href="/lien-he">trang Liên hệ <LuArrowUpRight aria-hidden /></Link>.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
