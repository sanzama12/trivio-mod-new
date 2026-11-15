"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./about-animations.module.css";
import { AboutTimelineNav } from "./about-banner-center";
import { LuFactory, LuRocket, LuSchool, LuVideo } from "react-icons/lu";

/* Port từ cặp slider "slider-nav + slider-x" của dungmori/ve-dungmori:
 * — nav: chips năm, autoplay 3.5s, bấm chọn mốc.
 * — content: mỗi mốc là ảnh + nội dung, đổi slide bằng fade + trượt ngang (sl-item). */

const milestones = [
  {
    year: "Năm 2025",
    icon: LuSchool,
    image: "/images/about/students-planning.webp",
    alt: "Ý tưởng Trovio khởi đầu từ nhu cầu định hướng nguyện vọng",
    title: "Trovio bắt đầu từ một vấn đề quen thuộc",
    description: "Thông tin tuyển sinh nằm rải rác qua nhiều đề án, thông báo và cổng dữ liệu. Trovio ra đời để tổ chức các mảnh thông tin này theo trường, ngành, chương trình và phương thức xét tuyển — dễ tìm, dễ đối chiếu, biết bước nào cần kiểm tra tiếp.",
  },
  {
    year: "Bước đầu",
    icon: LuVideo,
    image: "/images/about/students-guidance.webp",
    alt: "Xây dựng bộ dữ liệu chương trình có nguồn gốc rõ ràng",
    title: "Xây nền dữ liệu có nguồn gốc",
    description: "Đối chiếu chỉ tiêu, tổ hợp, phương thức, học phí và điểm chuẩn ưu tiên từ đề án hoặc thông báo chính thức của cơ sở đào tạo. Mỗi dữ liệu gắn với năm, phương thức và thang điểm đúng — không trộn thang điểm giữa các phương thức.",
  },
  {
    year: "Hiện tại",
    icon: LuRocket,
    image: "/images/about/students-campus.webp",
    alt: "Hệ sinh thái tra cứu, tính điểm và gợi ý nguyện vọng",
    title: "Hệ sinh thái định hướng tuyển sinh",
    description: "Tra cứu & so sánh, tính điểm phân tầng cơ hội và khám phá ngành học kết nối thành một hành trình liền mạch, không cần tài khoản cũng bắt đầu được.",
  },
  {
    year: "Tiếp theo",
    icon: LuFactory,
    image: "/images/about/students-guidance.webp",
    alt: "Mở rộng dữ liệu và cải tiến gợi ý minh bạch",
    title: "Mở rộng và minh bạch hoá gợi ý",
    description: "Tiếp tục mở rộng độ phủ dữ liệu mùa tuyển sinh mới, cải thiện tầng giải thích của gợi ý và giữ nguyên nguyên tắc: Trovio hỗ trợ thu hẹp lựa chọn, mọi quyết định vẫn thuộc về người học.",
  },
] as const;

export function AboutTimeline() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % milestones.length), 3500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const item = milestones[active];
  const Icon = item.icon;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="mx-auto flex max-w-2xl flex-col items-center">
        <div className="border-2 border-slate-900 border-b-0 bg-paper-50 px-3 py-0.5 text-xl font-bold tracking-wide text-slate-900">沿革</div>
        <div className="flex w-full items-center gap-4 border-t-2 border-slate-900 pt-4">
          <h2 className="mx-auto text-center text-2xl font-bold tracking-[-.02em] text-slate-900 uppercase sm:text-4xl">Lịch sử phát triển</h2>
        </div>
      </header>

      <div className="mt-10">
        <AboutTimelineNav milestones={milestones} active={active} onSelect={setActive} />
      </div>

      {/* slider-x: mỗi slide là sl-item (ảnh + nội dung canh giữa, gap 60px) */}
      <div key={active} className={styles.timelinePane}>
        <div className="mt-10 flex flex-col items-center gap-10 px-5 text-left sm:px-20 lg:flex-row">
          <div className="w-full max-w-xs shrink-0">
            <div className="relative aspect-square w-full">
              <Image src={item.image} alt={item.alt} fill sizes="(max-width: 1024px) 80vw, 320px" className="object-contain" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-primary-700 uppercase">
              <Icon className="size-4" aria-hidden /> {item.year}
            </div>
            <h3 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{item.title}</h3>
            <p className="mt-4 text-sm leading-6 text-justify text-slate-600 sm:text-base">{item.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
