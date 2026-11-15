"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import styles from "./about-animations.module.css";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/layout/logo";

const heroImages = [
  { src: "/images/about/students-campus.webp", alt: "Nhóm học sinh cùng khám phá khuôn viên đại học" },
  { src: "/images/about/students-guidance.webp", alt: "Học sinh thảo luận lựa chọn ngành học cùng người hướng dẫn" },
  { src: "/images/about/students-planning.webp", alt: "Hai học sinh cùng lập kế hoạch tuyển sinh" },
] as const;

export function AboutBannerCenter() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % heroImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const move = (step: number) => {
    setActive((current) => (current + step + heroImages.length) % heroImages.length);
  };

  return (
    <section className={styles.aboutKeyVisual} aria-labelledby="about-key-title">
      <div className={styles.aboutPhotoFrame}>
        {heroImages.map((image, index) => (
          <div
            key={image.src}
            className={cn(styles.aboutPhotoLayer, index === active && styles.aboutPhotoLayerActive)}
            aria-hidden={index !== active}
          >
            <Image
              src={image.src}
              alt={index === active ? image.alt : ""}
              fill
              sizes="(max-width: 768px) 100vw, 86vw"
              className={styles.aboutPhoto}
              priority={index === 0}
            />
          </div>
        ))}

        <div className={styles.aboutPhotoShade} aria-hidden />
        <div className={styles.aboutBrandPlate}>
          <div className={styles.aboutBrandLogo}><LogoMark className="size-9 sm:size-12" /></div>
          <div>
            <p>Định hướng tuyển sinh</p>
            <h1 id="about-key-title">Trovio</h1>
          </div>
        </div>

        <svg className={styles.aboutBirds} viewBox="0 0 230 120" fill="none" aria-hidden>
          <path d="M10 72c32-30 58-25 80 5 17-20 39-24 66-8" />
          <path d="M75 30c22-21 43-18 59 4 15-16 33-18 54-5" />
          <path d="M144 89c16-15 31-13 44 3 11-12 23-13 36-4" />
        </svg>

        <div className={styles.aboutSliderControls}>
          <button type="button" onClick={() => move(-1)} aria-label="Ảnh trước">
            <LuChevronLeft aria-hidden />
          </button>
          <div className={styles.aboutSliderDots} aria-label="Chọn ảnh giới thiệu">
            {heroImages.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ảnh ${index + 1}`}
                aria-current={index === active}
                className={index === active ? styles.aboutSliderDotActive : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Ảnh tiếp theo">
            <LuChevronRight aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

/* Port từ cặp slider slider-nav + slider-x của dungmori:
 * nav = các năm dạng TEXT + chevron hai bên (slick pull-left/pull-right, top:25%),
 * bấm năm → nhảy slide nội dung; autoplay 3.5s. */

export function AboutTimelineNav({
  milestones,
  active,
  onSelect,
}: {
  milestones: ReadonlyArray<{ year: string }>;
  active: number;
  onSelect: (index: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!strip || !chip) return;
    const target = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <div className="relative">
      <div ref={stripRef} className={cn("flex items-center gap-8 overflow-x-auto py-3 lg:justify-center", styles.navStrip)} role="tablist" aria-label="Chọn mốc thời gian">
        {milestones.map((item, index) => (
          <button
            key={item.year}
            data-index={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => onSelect(index)}
            className={cn(
              "shrink-0 text-base font-extrabold tracking-wide whitespace-nowrap transition-colors sm:text-lg",
              index === active ? "text-primary-700" : "text-slate-400 hover:text-primary-600",
            )}
          >
            {item.year}
            <span className={cn("mx-auto mt-2 block h-0.5 w-full origin-center rounded-full transition-transform", index === active ? "scale-x-100 bg-primary-600" : "scale-x-0 bg-primary-300")} aria-hidden />
          </button>
        ))}
      </div>

      {/* chevron pull-left / pull-right — top 25% như CSS gốc */}
      <span className="pointer-events-none absolute top-1/2 left-0 hidden size-8 -translate-y-1/2 items-center justify-center bg-gradient-to-r from-white to-transparent text-slate-400 sm:flex" aria-hidden>
        <LuChevronLeft className="size-5" />
      </span>
      <span className="pointer-events-none absolute top-1/2 right-0 hidden size-8 -translate-y-1/2 items-center justify-center bg-gradient-to-l from-white to-transparent text-slate-400 sm:flex" aria-hidden>
        <LuChevronRight className="size-5" />
      </span>
    </div>
  );
}

/* Wrapper reveal-on-scroll cho từng section (IntersectionObserver). */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className, styles.reveal, visible && styles.revealVisible)}>
      {children}
    </div>
  );
}
