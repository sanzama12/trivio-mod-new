import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowLeft, LuSparkles } from "react-icons/lu";
import { LogoMark } from "@/components/layout/logo";
import { StudentMascot } from "./student-mascot";
import styles from "./auth-experience.module.css";

export function AuthExperienceShell({ children }: { children: ReactNode }) {
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/dang-nhap" className={styles.back}><LuArrowLeft aria-hidden /> Quay lại đăng nhập</Link></header>
    <div className={styles.card}>
      <section className={styles.story} aria-label="Tài khoản Trovio">
        <span className={styles.eyebrow}><LuSparkles aria-hidden /> TÀI KHOẢN CỦA BẠN</span>
        <h2>Lưu hồ sơ.<br /><em>Theo dõi nguyện vọng.</em></h2>
        <StudentMascot covered={false} looking={false} progress={0} />
        <p className={styles.storyFoot}>Khôi phục quyền truy cập để tiếp tục sử dụng Trovio.</p>
      </section>
      <section className={styles.formSide} aria-label="Khôi phục tài khoản Trovio">
        <div className={styles.formBrand}><LogoMark className="size-9" /><span>Trovio</span></div>
        {children}
      </section>
    </div>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} Trovio</span><Link href="/tro-giup">Cần trợ giúp?</Link></footer>
  </div>;
}
