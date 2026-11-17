"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPause, LuPlay } from "react-icons/lu";
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
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!playing || interacting || motion.matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [playing, interacting]);

  const move = (step: number) => {
    setActive((current) => (current + step + heroImages.length) % heroImages.length);
  };

  return (
    <section className={styles.aboutKeyVisual} aria-labelledby="about-key-title"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
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
              sizes="(max-width: 1280px) 100vw, 1184px"
              quality={90}
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
          <span className={styles.aboutSlideCount} aria-hidden>{String(active + 1).padStart(2, "0")} / 03</span>
          <button type="button" onClick={() => setPlaying(value => !value)}
            aria-label={playing ? "Tạm dừng chuyển ảnh" : "Tiếp tục chuyển ảnh"} aria-pressed={!playing}>
            {playing ? <LuPause aria-hidden /> : <LuPlay aria-hidden />}
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
