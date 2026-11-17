import Link from "next/link";
import { LuArrowUpRight, LuCompass, LuChartNoAxesCombined, LuLayers, LuUsers } from "react-icons/lu";
import styles from "./featured-benefits.module.css";

const benefits = [
  {
    icon: LuCompass,
    title: "Hiểu bản thân, tìm hướng đi phù hợp.",
    description: "Khám phá sở thích qua trắc nghiệm RIASEC và tìm hiểu các nhóm ngành. Kết nối điều bạn yêu thích với những lựa chọn học tập cụ thể.",
    href: "/trac-nghiem",
    action: "Khám phá bản thân",
  },
  {
    icon: LuChartNoAxesCombined,
    title: "Nhìn rõ cơ hội từ năng lực hiện tại.",
    description: "Lưu điểm học tập, chọn tổ hợp và xem gợi ý An toàn, Vừa sức, Thử sức. Có thêm cơ sở để cân nhắc khi tham khảo điểm chuẩn các năm.",
    href: "/diem-cua-toi",
    action: "Tạo hồ sơ học tập",
  },
  {
    icon: LuLayers,
    title: "So sánh dễ dàng, lựa chọn có cơ sở.",
    description: "Đặt các chương trình cạnh nhau để xem điểm chuẩn, học phí và phương thức xét tuyển. Tìm lựa chọn phù hợp với mục tiêu và điều kiện của bạn.",
    href: "/so-sanh",
    action: "So sánh chương trình",
  },
  {
    icon: LuUsers,
    title: "Chủ động nguyện vọng, cùng nhau quyết định.",
    description: "Lưu những chương trình bạn quan tâm, sắp xếp thứ tự nguyện vọng và chia sẻ kế hoạch với gia đình để cùng trao đổi trước bước tiếp theo.",
    href: "/da-luu",
    action: "Xây dựng nguyện vọng",
  },
];

export function FeaturedBenefits() {
  return (
    <section className={styles.section} aria-labelledby="featured-benefits-title">
      <div className="container-page">
        <header className={styles.header}>
          <span>ĐỒNG HÀNH CÙNG MỖI LỰA CHỌN</span>
          <h2 id="featured-benefits-title">Giá trị nổi bật</h2>
          <p>Hiểu mình rõ hơn. Nhìn xa hơn. Chọn tương lai bằng sự chủ động.</p>
        </header>
        <div className={styles.layout}>
          <div className={styles.cards}>
            {benefits.slice(0, 2).map(benefit => <BenefitCard key={benefit.href} benefit={benefit} />)}
          </div>
          <div className={styles.illustration} aria-hidden="true">
            <svg viewBox="0 0 360 430" fill="none" className={styles.art}>
              <defs>
                <linearGradient id="benefit-bulb" x1="85" y1="45" x2="270" y2="290" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" /><stop offset="1" stopColor="#c2e1fb" />
                </linearGradient>
                <linearGradient id="benefit-book" x1="90" y1="315" x2="270" y2="385" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3663bd" /><stop offset="1" stopColor="#163a7b" />
                </linearGradient>
              </defs>
              <circle cx="180" cy="175" r="145" stroke="#cbe4f3" strokeDasharray="3 9" />
              <circle cx="180" cy="175" r="116" fill="#daf0fa" />
              <ellipse cx="180" cy="395" rx="140" ry="14" fill="#cbe2f1" opacity=".55" />
              <path d="M115 228C85 205 72 176 77 143C84 88 127 56 180 56C238 56 282 100 283 151C284 185 267 209 245 230C229 245 224 256 224 274H138C138 255 131 242 115 228Z" fill="url(#benefit-bulb)" stroke="#fff" strokeWidth="7" />
              <path d="M185 272V154M185 215L149 182M185 190L220 150" stroke="#479783" strokeWidth="7" strokeLinecap="round" />
              <path d="M181 176C146 163 137 133 143 107C176 116 195 143 181 176Z" fill="#7cba96" />
              <path d="M189 202C188 165 210 139 244 140C239 174 222 193 189 202Z" fill="#399c8b" />
              <path d="M174 228C145 228 124 210 120 185C147 184 170 197 174 228Z" fill="#5aa9a0" />
              <rect x="137" y="271" width="88" height="13" rx="6.5" fill="#315688" />
              <rect x="142" y="290" width="78" height="12" rx="6" fill="#315688" />
              <path d="M158 309H204L195 321H167L158 309Z" fill="#193e73" />
              <path d="M52 350L180 363L308 350V377L180 402L52 377V350Z" fill="url(#benefit-book)" />
              <path d="M180 359C147 333 108 326 61 335V367C106 362 147 371 180 390C213 371 253 362 299 367V335C253 326 213 333 180 359Z" fill="#fff" stroke="#bed3ee" strokeWidth="2" />
              <path d="M180 360V389M80 345C112 344 143 351 164 363M80 355C112 354 143 361 164 373M196 363C220 351 249 344 281 345M196 373C220 361 249 354 281 355" stroke="#c4d8ed" strokeWidth="3" strokeLinecap="round" />
              <path d="M180 21V35M55 92L66 99M296 89L307 82M46 220L60 216M299 218L313 222" stroke="#74aecf" strokeWidth="3" strokeLinecap="round" />
              <path d="M289 277L294 290L307 295L294 300L289 313L284 300L271 295L284 290Z" fill="#82b7d4" />
              <circle cx="68" cy="272" r="6" fill="#76b9a7" /><circle cx="282" cy="38" r="4" fill="#a2cbdc" />
            </svg>
            <div className={styles.artCaption}><span>TỪ HIỂU MÌNH</span><strong>Đến chọn đúng.</strong><i /></div>
          </div>
          <div className={styles.cards}>
            {benefits.slice(2).map(benefit => <BenefitCard key={benefit.href} benefit={benefit} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit }: { benefit: (typeof benefits)[number] }) {
  const Icon = benefit.icon;
  return (
    <article className={styles.card}>
      <span className={styles.icon}><Icon aria-hidden /></span>
      <h3>{benefit.title}</h3>
      <p>{benefit.description}</p>
      <Link href={benefit.href}>{benefit.action}<LuArrowUpRight aria-hidden /></Link>
    </article>
  );
}
