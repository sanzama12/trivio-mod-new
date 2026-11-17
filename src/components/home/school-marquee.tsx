"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { LuArrowUpRight, LuPause, LuPlay } from "react-icons/lu";
import { SchoolLogo } from "@/components/school/school-logo";
import styles from "./school-marquee.module.css";

type School = { id: string; name: string; code: string; slug: string; logoUrl: string | null };

export function SchoolMarquee({ schools }: { schools: School[] }) {
  const [paused, setPaused] = useState(false);
  if (!schools.length) return null;

  return (
    <div className={styles.strip} role="region" aria-label="Khám phá các trường trong danh mục Trovio">
      <p className={styles.heading}>KHÁM PHÁ CÁC TRƯỜNG<span>trong danh mục Trovio</span></p>
      <div className={styles.viewport} data-paused={paused || undefined}>
        <div className={styles.track} style={{ "--marquee-duration": `${schools.length * 4}s` } as CSSProperties}>
          {[0, 1].map(copy => (
            <div className={styles.group} key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {schools.map(school => (
                <Link className={styles.school} key={school.id} href={`/truong/${school.slug}`}
                  title={school.name} aria-label={school.name} tabIndex={copy === 1 ? -1 : undefined}>
                  <SchoolLogo school={school} size="sm" className={styles.logo} />
                  <span>{school.code}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.pause} aria-label={paused ? "Tiếp tục chạy logo trường" : "Tạm dừng logo trường"}
          aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          {paused ? <LuPlay aria-hidden /> : <LuPause aria-hidden />}
        </button>
        <Link href="/truong" className={styles.more} aria-label="Xem tất cả trường"><LuArrowUpRight aria-hidden /></Link>
      </div>
    </div>
  );
}
