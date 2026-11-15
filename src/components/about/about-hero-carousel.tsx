"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuPause, LuPlay } from "react-icons/lu";
import { cn } from "@/lib/cn";

const slides = [
  {
    image: "/images/about/students-campus.webp",
    alt: "Nhóm học sinh khám phá khuôn viên đại học",
    eyebrow: "Khám phá có định hướng",
    title: "Tìm lựa chọn phù hợp, không chỉ lựa chọn nổi tiếng.",
    description: "Khám phá trường, ngành và chương trình theo tổ hợp, khu vực, học phí cùng những ưu tiên thực sự quan trọng với bạn.",
    href: "/chuong-trinh",
    action: "Khám phá chương trình",
  },
  {
    image: "/images/about/students-guidance.webp",
    alt: "Học sinh thảo luận lựa chọn ngành học cùng người hướng dẫn",
    eyebrow: "Hiểu trước khi chọn",
    title: "Mỗi gợi ý đều cần một lý do rõ ràng.",
    description: "Trovio đối chiếu sở thích, điểm số, vị trí và ngân sách để bạn hiểu vì sao một chương trình xuất hiện trong danh sách.",
    href: "/cach-goi-y",
    action: "Xem cách Trovio gợi ý",
  },
  {
    image: "/images/about/students-planning.webp",
    alt: "Hai học sinh cùng lập kế hoạch tuyển sinh trên máy tính bảng",
    eyebrow: "Chủ động với nguyện vọng",
    title: "Biến thông tin thành một kế hoạch có chiến lược.",
    description: "Lưu, so sánh và sắp xếp lựa chọn theo ba lớp cơ hội An toàn, Vừa sức và Thử sức — quyền quyết định luôn là của bạn.",
    href: "/da-luu",
    action: "Xây danh sách của bạn",
  },
] as const;

export function AboutHeroCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const goTo = useCallback((index: number) => setActive((index + slides.length) % slides.length), []);

  useEffect(() => {
    if (!playing || interacting) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [interacting, playing]);

  const slide = slides[active];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Giới thiệu Trovio"
      className="relative overflow-hidden rounded-[2.25rem] border border-primary-200 bg-paper-50 p-3 shadow-[0_22px_60px_-42px_rgba(15,93,94,.55)] sm:p-5"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
    >
      <div className="grid min-h-[34rem] gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-stretch">
        <div className="order-2 flex flex-col justify-center px-3 pt-2 pb-16 sm:px-6 lg:order-1 lg:py-12 lg:pr-4 lg:pl-7">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-xs font-black tracking-[.2em] text-primary-700 uppercase">{slide.eyebrow}</p>
            <h2 className="mt-3 text-3xl leading-[1.12] font-black tracking-[-.035em] text-slate-900 sm:text-4xl">{slide.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{slide.description}</p>
            <Link href={slide.href} className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary-600 pb-1 text-sm font-extrabold text-primary-700 transition hover:border-accent-500 hover:text-primary-900">
              {slide.action} <LuArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="relative order-1 min-h-[22rem] overflow-hidden rounded-[5rem_1.5rem_5rem_1.5rem] bg-primary-50 lg:order-2 lg:min-h-full lg:rounded-[8rem_1.5rem_8rem_1.5rem]">
          {slides.map((item, index) => (
            <Image
              key={item.image}
              src={item.image}
              alt={index === active ? item.alt : ""}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className={cn("object-cover transition duration-700 ease-out", index === active ? "scale-100 opacity-100" : "pointer-events-none scale-[1.025] opacity-0")}
            />
          ))}
          <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-black/5" />
          <span aria-hidden className="absolute right-5 bottom-5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black tracking-[.14em] text-primary-800 uppercase shadow-sm backdrop-blur">Định hướng tương lai</span>
        </div>
      </div>

      <div className="absolute bottom-5 left-6 flex items-center gap-4 sm:left-11">
        <div className="flex gap-2" role="tablist" aria-label="Chọn ảnh giới thiệu">
          {slides.map((item, index) => (
            <button key={item.image} type="button" role="tab" aria-selected={index === active} aria-label={`Hiển thị ảnh ${index + 1}: ${item.eyebrow}`} onClick={() => goTo(index)} className={cn("h-2.5 rounded-full border border-primary-400 transition-all focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary-600", index === active ? "w-8 bg-primary-600" : "w-2.5 bg-white hover:bg-primary-100")} />
          ))}
        </div>
        <button type="button" onClick={() => setPlaying((value) => !value)} className="text-primary-700 hover:text-primary-900" aria-label={playing ? "Tạm dừng tự chuyển ảnh" : "Tiếp tục tự chuyển ảnh"}>
          {playing ? <LuPause className="size-4" aria-hidden /> : <LuPlay className="size-4" aria-hidden />}
        </button>
      </div>

      <div className="absolute right-6 bottom-4 flex gap-2 sm:right-8">
        <button type="button" onClick={() => goTo(active - 1)} className="flex size-10 items-center justify-center rounded-full border border-primary-200 bg-white text-primary-700 shadow-sm transition hover:border-primary-400 hover:bg-primary-50" aria-label="Ảnh trước"><LuArrowLeft className="size-4" aria-hidden /></button>
        <button type="button" onClick={() => goTo(active + 1)} className="flex size-10 items-center justify-center rounded-full bg-primary-700 text-white shadow-sm transition hover:bg-primary-800" aria-label="Ảnh tiếp theo"><LuArrowRight className="size-4" aria-hidden /></button>
      </div>
    </section>
  );
}
