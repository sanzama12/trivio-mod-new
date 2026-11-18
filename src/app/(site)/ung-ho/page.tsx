import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
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
import { getCurrentUser } from "@/lib/auth";
import styles from "./donate.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ủng hộ Trovio",
  description: "Ủng hộ việc duy trì và cải thiện công cụ tra cứu tuyển sinh Trovio.",
};

const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

const purposes = [
  { icon: LuMonitor, title: "Vận hành nền tảng", detail: "Duy trì công cụ tra cứu và lưu nguyện vọng." },
  { icon: LuBookOpen, title: "Chăm sóc dữ liệu", detail: "Rà soát thông tin tuyển sinh để dễ đối chiếu hơn." },
  { icon: LuShieldCheck, title: "Cải thiện trải nghiệm", detail: "Làm các công cụ định hướng rõ ràng, dễ dùng hơn." },
];

export default async function DonatePage() {
  const [donors, user] = await Promise.all([donationService.getRecentDonors(), getCurrentUser()]);
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
              Đóng góp của bạn giúp duy trì công cụ tra cứu và thông tin tuyển sinh.
            </p>
            <div className={styles.purposes}>
              <p>Khoản ủng hộ được dùng để</p>
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
          <DonateForm availability={availability} defaultDonorName={user?.name} demoMethods={process.env.DONATION_PAYMENT_DEMO === "true"} />
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
              <table aria-label="Đóng góp gần đây" className={styles.donorTable}>
                <thead><tr><th scope="col">Người ủng hộ</th><th scope="col">Đóng góp</th></tr></thead>
                <tbody>
                {donors.map((donor) => (
                  <tr key={donor.id}>
                    <td><span className={styles.donorIdentity}>
                      <span className={styles.donorInitial} aria-hidden>{donor.name.charAt(0).toLocaleUpperCase("vi-VN")}</span>
                      <span className={styles.donorText}>
                        <strong>{donor.name}</strong>
                        <small>{donor.paidAt ? new Date(donor.paidAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }) : "Đã xác nhận"}</small>
                      </span>
                    </span></td>
                    <td className={styles.donorAmount}>{money(donor.amount)}</td>
                  </tr>
                ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.emptyState}>Chưa có khoản đóng góp hoàn tất để hiển thị.</p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
