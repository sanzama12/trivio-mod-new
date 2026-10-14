"use client";

import Link from "next/link";
import { useState } from "react";
import { LuCalculator, LuCompass, LuSparkles, LuTarget } from "react-icons/lu";
import { formatMethodScore, profileScore, ADMISSION_METHODS } from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { RecCard } from "@/components/recommend/rec-card";
import { WhyDrawer } from "@/components/recommend/why-drawer";
import { useRecommendations } from "@/components/recommend/use-recommendations";

/** Gợi ý "Dành cho bạn" trên trang chủ: dựa trên RIASEC, điểm & phương thức, tỉnh/thành, ngân sách, mục tiêu. */
export function ForYouSection() {
  const { quiz, profile, hydrated } = useTrovio();
  const { items, goal, province, userScore, budgetMax, hasInput } = useRecommendations(6);
  const [why, setWhy] = useState<number | null>(null);

  if (!hydrated || items === null) {
    return (
      <section className="container-page pt-16" aria-busy="true">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (!hasInput) {
    return (
      <section className="container-page pt-16" aria-labelledby="for-you-empty">
        <Card className="flex flex-col items-start gap-5 bg-gradient-to-r from-primary-50 to-accent-50 p-6 md:flex-row md:items-center md:p-8">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm">
            <LuSparkles className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 id="for-you-empty" className="text-lg font-bold text-slate-900">
              Nhận gợi ý chương trình dành riêng cho bạn
            </h2>
            <p className="mt-1 text-sm text-slate-600">Làm trắc nghiệm sở thích (7–10 phút), nhập điểm hoặc đặt mục tiêu — Trovio sẽ gợi ý 6 chương trình kèm lý do cụ thể.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/trac-nghiem" className={buttonClass()}>
              <LuCompass className="size-4" aria-hidden /> Làm trắc nghiệm
            </Link>
            <Link href="/diem-cua-toi" className={buttonClass({ variant: "outline", className: "bg-white" })}>
              <LuCalculator className="size-4" aria-hidden /> Nhập điểm
            </Link>
            <Link href="/muc-tieu" className={buttonClass({ variant: "ghost" })}>
              <LuTarget className="size-4" aria-hidden /> Đặt mục tiêu
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  const basis = [
    quiz && `mã RIASEC ${quiz.result.code.join("-")}`,
    profile &&
      (() => {
        const s = profileScore(profile);
        return `${formatMethodScore(s.total, s.method)} điểm ${ADMISSION_METHODS[s.method].short}`;
      })(),
    province && `tỉnh/thành ${province}`,
    goal && `mục tiêu ${goal.majorName}`,
  ].filter(Boolean);

  return (
    <section className="container-page pt-16" aria-labelledby="for-you" data-tour="for-you">
      <SectionHeading
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <LuSparkles className="size-4" aria-hidden /> Dành cho bạn
          </span>
        }
        title={<span id="for-you">Chương trình gợi ý cho bạn</span>}
        subtitle={`Dựa trên ${basis.join(", ")}.${!quiz ? " Làm trắc nghiệm để gợi ý sát sở thích hơn." : ""}${!profile ? " Nhập điểm để xem mức An toàn / Vừa sức." : ""}`}
        action={
          <Link href="/goi-y" className="text-sm font-semibold text-primary-600 hover:underline">
            Xem tất cả gợi ý →
          </Link>
        }
      />
      {goal?.warning && (
        <p className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-3 text-[13px] text-accent-700">{goal.warning}</p>
      )}
      {items.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-600">
          Chưa tìm được chương trình phù hợp với ngân sách và khu vực bạn chọn.{" "}
          <Link href="/diem-cua-toi" className="font-semibold text-primary-600 hover:underline">
            Điều chỉnh điều kiện
          </Link>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((rec, i) => (
            <li key={rec.view.program.id}>
              <RecCard rec={rec} goalName={goal?.majorName ?? null} budgetMax={budgetMax} onWhy={() => setWhy(i)} />
            </li>
          ))}
        </ul>
      )}
      {why != null && items[why] && (
        <WhyDrawer rec={items[why]} rank={why + 1} total={items.length} userScore={userScore} onClose={() => setWhy(null)} />
      )}
    </section>
  );
}
