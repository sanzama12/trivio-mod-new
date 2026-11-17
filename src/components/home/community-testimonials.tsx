import Link from "next/link";
import { LuArrowUpRight, LuGraduationCap, LuBookOpen, LuHeartHandshake, LuQuote } from "react-icons/lu";
import styles from "./community-testimonials.module.css";

const voices = [
  {
    icon: LuBookOpen,
    name: "Góc nhìn học sinh",
    caption: "Từ những lựa chọn đầu tiên",
    question: "Điều gì giúp bạn rõ hướng hơn?",
    description: "Kể về trải nghiệm khám phá ngành học, lưu điểm hoặc tìm chương trình phù hợp. Điều bạn thấy hữu ích và điều còn băn khoăn đều đáng được lắng nghe.",
    action: "Chia sẻ trải nghiệm học sinh",
  },
  {
    icon: LuGraduationCap,
    name: "Góc nhìn sinh viên",
    caption: "Từ trải nghiệm đã đi qua",
    question: "Bạn muốn nhắn gì với người đi sau?",
    description: "Chia sẻ cách bạn tìm hiểu ngành, cân nhắc trường học và chuẩn bị nguyện vọng. Trải nghiệm thực tế của bạn có thể mở thêm góc nhìn cho các bạn đang lựa chọn.",
    action: "Chia sẻ trải nghiệm sinh viên",
  },
  {
    icon: LuHeartHandshake,
    name: "Góc nhìn phụ huynh",
    caption: "Từ sự đồng hành và thấu hiểu",
    question: "Bạn đã cùng con lựa chọn thế nào?",
    description: "Chia sẻ trải nghiệm trao đổi cùng con về ngành học, học phí và kế hoạch tương lai. Trovio mong được lắng nghe để hỗ trợ gia đình tốt hơn.",
    action: "Chia sẻ trải nghiệm phụ huynh",
  },
];

export function CommunityTestimonials() {
  return (
    <section className={styles.section} aria-labelledby="community-testimonials-title">
      <div className="container-page">
        <header className={styles.header}>
          <span>LẮNG NGHE ĐỂ ĐỒNG HÀNH TỐT HƠN</span>
          <h2 id="community-testimonials-title">Đánh giá từ người dùng</h2>
          <p>Mỗi trải nghiệm là một góc nhìn đáng quý.<br />Cùng góp ý để hành trình chọn trường, chọn ngành trở nên rõ ràng hơn.</p>
        </header>
        <div className={styles.grid}>
          {voices.map(({ icon: Icon, name, caption, question, description, action }) => (
            <article className={styles.card} key={name}>
              <div className={styles.avatar} aria-hidden="true">
                <span className={styles.avatarInner}><Icon /></span>
              </div>
              <div className={styles.identity}>
                <h3>{name}</h3>
                <p>{caption}</p>
              </div>
              <div className={styles.body}>
                <LuQuote className={styles.quote} aria-hidden />
                <h4>{question}</h4>
                <p>{description}</p>
                <span className={styles.pending}>Đang chờ chia sẻ từ cộng đồng</span>
              </div>
              <Link href="/lien-he" className={styles.link} aria-label={action}>Gửi chia sẻ của bạn <LuArrowUpRight aria-hidden /></Link>
            </article>
          ))}
        </div>
        <p className={styles.note}>Chưa có đánh giá người dùng được công bố. Bạn có thể gửi trải nghiệm và góp ý qua trang liên hệ.</p>
      </div>
    </section>
  );
}
