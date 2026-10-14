"use client";

/**
 * Các mảnh UI nhỏ của "Phong cách làm việc" dùng lại ở thẻ gợi ý, ngăn "Vì sao gợi ý?", trang kết quả trắc nghiệm.
 * Chỉ HIỂN THỊ — không tham gia tính điểm phù hợp.
 */
import Link from "next/link";
import type { IconType } from "react-icons";
import { LuArrowRight, LuCalendar, LuCircleCheck, LuCompass, LuLightbulb, LuMinus, LuPuzzle, LuUsers } from "react-icons/lu";
import type { Major, WorkAxis } from "@/domain/types";
import { AXIS_INFO, leanShort, majorStyleProfile, matchWorkStyle, neutralAxes, styleLine, styleReasons, styleSentence, WORK_AXES } from "@/domain/work-style";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const AXIS_ICON: Record<WorkAxis, IconType> = { social: LuUsers, stability: LuCalendar, hands: LuPuzzle, detail: LuLightbulb };

type MajorRef = Pick<Major, "slug" | "groupId" | "name">;

/** Dòng phong cách trên thẻ gợi ý (chỉ hiện khi đã làm mini-test và ngành có xu hướng rõ). */
export function StyleLine({ major, className }: { major: MajorRef; className?: string }) {
  const { workStyle } = useTrovio();
  const m = workStyle ? matchWorkStyle(workStyle.scores, major) : null;
  if (!m) return null;
  return (
    <p className={cn("flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700", className)}>
      <LuCompass className="mt-0.5 size-3.5 shrink-0 text-primary-600" aria-hidden />
      <span className="flex-1">
        <span className="font-semibold">Phong cách · </span>
        {styleLine(m)}
      </span>
      <span className="shrink-0 text-[11px] text-slate-400">tham khảo</span>
    </p>
  );
}

/** Khối "Phong cách làm việc" trong ngăn "Vì sao gợi ý?". */
export function StyleWhyBlock({ major }: { major: MajorRef }) {
  const { workStyle } = useTrovio();
  if (!workStyle) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3.5">
        <LuCompass className="size-4 shrink-0 text-slate-500" aria-hidden />
        <p className="min-w-0 flex-1 text-[13px] text-slate-600">Muốn biết ngành này có hợp cách bạn thích làm việc? Làm mini-test 12 tình huống (khoảng 2 phút).</p>
        <Link href="/trac-nghiem/phong-cach" className={buttonClass({ variant: "outline", size: "sm" })}>
          Làm thử
        </Link>
      </div>
    );
  }
  const m = matchWorkStyle(workStyle.scores, major);
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <LuCompass className="size-4 text-slate-600" aria-hidden />
        <p className="flex-1 font-semibold text-slate-900">Phong cách làm việc</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">tham khảo · không tính điểm</span>
      </div>
      {m ? (
        <ul className="mt-2 space-y-1.5">
          {styleReasons(workStyle.scores, m).map((r) => (
            <li key={r.axis} className="flex gap-2 text-[13px] text-slate-600">
              {r.ok ? <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-success-600" aria-label="Khớp" /> : <LuMinus className="mt-0.5 size-4 shrink-0 text-slate-400" aria-label="Khác" />}
              <span>{r.text}</span>
            </li>
          ))}
          {neutralAxes(m).length > 0 && (
            <li className="flex gap-2 text-[13px] text-slate-500">
              <LuMinus className="mt-0.5 size-4 shrink-0 text-slate-300" aria-hidden />
              <span>{neutralAxes(m).map((a) => `${AXIS_INFO[a].leftShort.toLowerCase()} hay ${AXIS_INFO[a].rightShort.toLowerCase()}`).join("; ")}: ngành này không nghiêng rõ.</span>
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-slate-600">Ngành {major.name} không nghiêng rõ về phong cách làm việc nào — hợp với nhiều kiểu người.</p>
      )}
      <p className="mt-2 text-xs text-slate-500">Phong cách không cộng hay trừ vào điểm phù hợp ở trên.</p>
    </div>
  );
}

/** Các viên nhãn phong cách của người dùng (VD "Cùng mọi người · Ổn định · Máy tính · Chi tiết"). */
export function StylePills({ scores, className }: { scores: Record<WorkAxis, number>; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Phong cách làm việc của bạn">
      {WORK_AXES.map((a) => {
        const Icon = AXIS_ICON[a];
        return (
          <li key={a} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Icon className="size-3.5" aria-hidden /> {leanShort(a, scores[a])}
          </li>
        );
      })}
    </ul>
  );
}

/** Thẻ trên trang kết quả trắc nghiệm: mời làm mini-test, hoặc tóm tắt nếu đã làm. */
export function StyleEntryCard({ className }: { className?: string }) {
  const { workStyle, mbti, hydrated } = useTrovio();
  if (!hydrated) return null;
  if (!workStyle) {
    return (
      <div className={cn("rounded-2xl border border-primary-200 bg-white p-5", className)}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <LuCompass className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Thêm một góc nhìn: Phong cách làm việc</h2>
            <p className="text-xs text-slate-500">12 tình huống · khoảng 2 phút · tham khảo</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-slate-600">
          Biết mình thích làm nhóm hay một mình, ổn định hay thay đổi… để hiểu thêm vì sao một ngành hợp với bạn. Không đổi điểm phù hợp.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href="/trac-nghiem/phong-cach" className={buttonClass({ size: "sm" })}>
            Làm mini-test <LuArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/trac-nghiem/phong-cach#mbti" className={buttonClass({ variant: "ghost", size: "sm", className: "text-primary-700" })}>
            Đã biết mã MBTI?
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">Phong cách làm việc của bạn</h2>
        <Badge tone="accent">Tham khảo</Badge>
      </div>
      <StylePills scores={workStyle.scores} className="mt-3" />
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">{mbti ? `MBTI: ${mbti.code} (tham khảo)` : "Chưa nhập mã MBTI"}</span>
        <Link href="/trac-nghiem/phong-cach" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600 hover:underline">
          Xem chi tiết <LuArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Câu giải thích phong cách cho thẻ ngành trên trang kết quả trắc nghiệm. */
export function MajorStyleNote({ major, code }: { major: MajorRef; code: string }) {
  const { workStyle } = useTrovio();
  const m = workStyle ? matchWorkStyle(workStyle.scores, major) : null;
  if (!m) return null;
  return (
    <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
      <LuCompass className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
      <span>
        {styleSentence(major.name, code, m)} <span className="text-slate-400">(phong cách · tham khảo)</span>
      </span>
    </p>
  );
}

/** Thẻ ở trang chi tiết ngành: phong cách làm việc thường gặp của ngành (+ so với bạn nếu đã làm mini-test). */
export function MajorStyleCard({ major }: { major: MajorRef }) {
  const { workStyle, hydrated } = useTrovio();
  const profile = majorStyleProfile(major);
  const axes = WORK_AXES.filter((a) => profile[a] !== undefined);
  if (axes.length === 0) return null;
  const m = hydrated && workStyle ? matchWorkStyle(workStyle.scores, major) : null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">Phong cách làm việc</h2>
        <Badge tone="accent">Tham khảo</Badge>
      </div>
      <p className="mt-1 text-[13px] text-slate-500">Điều thường gặp khi học và làm ngành {major.name}:</p>
      <ul className="mt-3 space-y-2.5">
        {axes.map((a) => {
          const pole = profile[a]!;
          const Icon = AXIS_ICON[a];
          const info = AXIS_INFO[a];
          return (
            <li key={a} className="flex gap-2 text-[13px]">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
              <span>
                <strong className="text-slate-900">{pole === 1 ? info.left : info.right}:</strong>{" "}
                <span className="text-slate-600">{pole === 1 ? info.leftMajor : info.rightMajor}.</span>
              </span>
            </li>
          );
        })}
      </ul>
      {m ? (
        <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
          <LuCompass className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
          <span>Với bạn: {styleLine(m)}</span>
        </p>
      ) : (
        hydrated && (
          <Link href="/trac-nghiem/phong-cach" className="mt-3 inline-block text-[13px] font-semibold text-primary-600 hover:underline">
            Làm mini-test 2 phút để so với phong cách của bạn →
          </Link>
        )
      )}
    </Card>
  );
}
