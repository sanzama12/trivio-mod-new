"use client";

/**
 * Lộ trình 5 bước ở trang chủ: cho người mới biết nên làm gì tiếp theo.
 * Trạng thái lấy từ dữ liệu đã lưu (trình duyệt hoặc tài khoản) — không cần đăng nhập để thấy tiến độ.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";

type Step = { key: string; title: string; desc: string; href: string; cta: string; done: boolean };

export function JourneySteps() {
  const { quiz, profile, saved, wishlist, hydrated, user } = useTrovio();
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!user) return setShared(false);
    let alive = true;
    fetch("/api/account/share")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setShared(!!d?.share))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  const steps: Step[] = [
    { key: "quiz", title: "Khám phá sở thích", desc: "Trắc nghiệm RIASEC 7–10 phút để biết nhóm ngành hợp với bạn.", href: quiz ? "/trac-nghiem/ket-qua" : "/trac-nghiem", cta: "Làm trắc nghiệm", done: !!quiz },
    { key: "score", title: "Nhập điểm", desc: "Điểm thi, học bạ hoặc ĐGNL để xem mức An toàn / Vừa sức / Thử sức.", href: "/diem-cua-toi", cta: "Nhập điểm", done: !!profile },
    { key: "save", title: "Lưu chương trình", desc: "Xem gợi ý “Dành cho bạn”, bấm ♡ để lưu các chương trình quan tâm.", href: "/chuong-trinh", cta: "Tìm chương trình", done: saved.length > 0 },
    { key: "wishlist", title: "Lập nguyện vọng", desc: "Sắp xếp thứ tự nguyện vọng và kiểm tra chiến lược.", href: "/da-luu", cta: "Lập nguyện vọng", done: wishlist.length > 0 },
    { key: "share", title: "Hỏi ý kiến gia đình", desc: "Gửi link chỉ xem cho phụ huynh để nhận góp ý.", href: "/da-luu", cta: "Chia sẻ", done: shared },
  ];
  const doneCount = hydrated ? steps.filter((s) => s.done).length : 0;
  const next = hydrated ? steps.find((s) => !s.done) : steps[0];
  const nextIndex = next ? steps.indexOf(next) : -1;

  return (
    <section aria-labelledby="lo-trinh-title" className="container-page pt-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="lo-trinh-title" className="text-lg font-bold text-slate-900 md:text-xl">
              Lộ trình chọn ngành của bạn
            </h2>
            <p className="mt-0.5 text-sm text-slate-600" aria-live="polite">
              {!hydrated ? "Đang tải tiến độ…" : next ? `Bước ${nextIndex + 1}/5: ${next.title.toLowerCase()}` : "Bạn đã hoàn thành cả 5 bước — hãy xem lại nguyện vọng trước hạn đăng ký."}
            </p>
          </div>
          {next && (
            <Link href={next.href} className={buttonClass({ size: "sm" })}>
              {next.cta} <LuArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Tiến độ lộ trình" aria-valuemin={0} aria-valuemax={5} aria-valuenow={doneCount}>
          <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${(doneCount / 5) * 100}%` }} />
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => {
            const current = hydrated && i === nextIndex;
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex h-full gap-3 rounded-xl border p-3 transition-colors",
                    current ? "border-primary-600 bg-primary-50" : "border-slate-200 hover:border-primary-200",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      hydrated && s.done ? "bg-success-700 text-white" : current ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {hydrated && s.done ? <LuCheck className="size-4" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {s.title}
                      {hydrated && s.done && <span className="sr-only"> (đã xong)</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{s.desc}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
