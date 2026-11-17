"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./turning-book.module.css";

export function TurningBook() {
  const section = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={section} className={styles.background} aria-hidden="true" data-turning-book>
        <div className={styles.scene}>
          <div className={styles.halo} aria-hidden />
          <div className={styles.bookShadow} aria-hidden />
          <div className={styles.perspective} aria-hidden="true">
            <div className={styles.book} data-running={visible}>
              <div className={styles.cover} />
              <div className={styles.pageStack} />
              <div className={styles.openPages}>
                <div className={styles.leftPage}><PageDesign /></div>
                <div className={styles.rightPage}><PageDesign /></div>
                {[0, 1, 2].map(index => (
                  <div key={index} className={styles.turningPage} style={{ "--page-delay": `${index * -4}s` } as CSSProperties}>
                    <div className={`${styles.face} ${styles.front}`}><PageDesign /></div>
                    <div className={`${styles.face} ${styles.back}`}><PageDesign /></div>
                  </div>
                ))}
                <div className={styles.spine} />
              </div>
              <div className={styles.ribbon} />
            </div>
          </div>
        </div>
    </div>
  );
}

function PageDesign() {
  return (
    <div className={styles.pageDesign}>
      <div className={styles.lines}><i /><i /><i /><i /></div>
    </div>
  );
}
