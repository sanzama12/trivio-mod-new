import Link from "next/link";
import { LuArrowUpRight, LuGraduationCap, LuBookOpen, LuHeartHandshake, LuQuote } from "react-icons/lu";
import styles from "./community-testimonials.module.css";

const voices = [
  {
    icon: LuBookOpen,
    name: "Góc nhìn học sinh",
    caption: "Đang tìm hiểu ngành học",
    question: "Điều gì giúp bạn rõ hướng hơn?",
    description: "Chia sẻ điều hữu ích hoặc điểm còn khó hiểu khi bạn tìm ngành, trường và chương trình.",
    action: "Chia sẻ trải nghiệm học sinh",
  },
  {
    icon: LuGraduationCap,
    name: "Góc nhìn sinh viên",
    caption: "Đã trải qua mùa tuyển sinh",
    question: "Bạn muốn nhắn gì với người đi sau?",
    description: "Kể cách bạn tìm hiểu ngành, trường và sắp xếp nguyện vọng.",
    action: "Chia sẻ trải nghiệm sinh viên",
  },
  {
    icon: LuHeartHandshake,
    name: "Góc nhìn phụ huynh",
    caption: "Cùng con cân nhắc lựa chọn",
    question: "Bạn đã cùng con lựa chọn thế nào?",
    description: "Chia sẻ cách gia đình trao đổi về ngành học, học phí và nguyện vọng.",
    action: "Chia sẻ trải nghiệm phụ huynh",
  },
];

export function CommunityTestimonials() {
  return (
    <section className={styles.section} aria-labelledby="community-testimonials-title">
      <div className="container-page">
        <header className={styles.header}>
          <span>GÓP Ý CHO TROVIO</span>
          <h2 id="community-testimonials-title">Chia sẻ trải nghiệm</h2>
          <p>Ý kiến của học sinh, sinh viên và phụ huynh giúp cải thiện thông tin trên Trovio.</p>
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
