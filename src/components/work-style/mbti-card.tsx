"use client";

/**
 * "Góc nhìn tham khảo · MBTI": học sinh tự chọn mã đã biết (16 mã) → so với mini-test phong cách.
 * Không tính vào điểm phù hợp. Mô tả ngắn do Trovio tự viết, không sao chép nội dung của bên khác.
 */
import Link from "next/link";
import { LuChevronDown, LuCircleCheck, LuInfo, LuMinus, LuX } from "react-icons/lu";
import { compareMbti, MBTI_CODES, type MbtiCode, type MbtiCompareStatus, isMbtiCode } from "@/domain/work-style";
import { track } from "@/lib/track";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const STATUS_ICON: Record<MbtiCompareStatus, { Icon: typeof LuCircleCheck; cls: string; label: string }> = {
  match: { Icon: LuCircleCheck, cls: "text-success-600", label: "Khớp" },
  diff: { Icon: LuX, cls: "text-slate-400", label: "Khác" },
  none: { Icon: LuMinus, cls: "text-slate-400", label: "Không so sánh" },
  unknown: { Icon: LuInfo, cls: "text-slate-400", label: "Chưa có mini-test" },
};

export function WhyRiasec({ className, defaultOpen }: { className?: string; defaultOpen?: boolean }) {
  return (
    <details className={cn("group rounded-2xl border border-primary-100 bg-primary-50 p-4", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary-900 [&::-webkit-details-marker]:hidden">
        Vì sao Trovio dùng RIASEC làm chính?
        <LuChevronDown className="size-4 shrink-0 text-primary-700 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-primary-800">
        <p>
          RIASEC (mô hình Holland) đo <strong>sở thích nghề nghiệp</strong> và được dùng trong cơ sở dữ liệu nghề O*NET để nối sở thích với hàng trăm nghề. Mỗi ngành
          trên Trovio đều có mã RIASEC nên so khớp được trực tiếp.
        </p>
        <p>
          MBTI mô tả <strong>tính cách</strong>. Nhiều nghiên cứu ghi nhận một phần đáng kể người làm lại sau vài tuần ra mã khác, nên Trovio chỉ dùng MBTI làm góc nhìn
          tham khảo — không dùng để tính điểm phù hợp.
        </p>
      </div>
    </details>
  );
}

export function MbtiCard({ className, id = "mbti" }: { className?: string; id?: string }) {
  const { mbti, setMbti, workStyle } = useTrovio();
  const toast = useToast();
  const current = mbti && isMbtiCode(mbti.code) ? mbti.code : null;

  const pick = (code: MbtiCode) => {
    if (code === current) return;
    if (!current) track("mbti_added");
    setMbti({ code, updatedAt: new Date().toISOString() });
    toast(`Đã lưu mã ${code} (chỉ để tham khảo)`, "success");
  };
  const remove = () => {
    setMbti(null);
    toast("Đã xoá mã MBTI", "info");
  };

  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="font-bold text-slate-900">
          Góc nhìn tham khảo · MBTI
        </h2>
        <Badge tone="slate">Không tính điểm</Badge>
      </div>
      <p className="mt-1.5 text-[13px] text-slate-600">Nếu đã từng làm MBTI ở nơi khác, chọn mã của bạn để so với mini-test phong cách.</p>
      <div role="group" aria-label="Chọn mã MBTI của bạn" className="mt-3 grid grid-cols-4 gap-1.5">
        {MBTI_CODES.map((code) => {
          const on = code === current;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => pick(code)}
              className={cn(
                "h-10 rounded-lg border text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                on ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50",
              )}
            >
              {code}
            </button>
          );
        })}
      </div>

      {current ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success-700" role="status">
              <LuCircleCheck className="size-4" aria-hidden /> Đã lưu mã {current}
            </p>
            <button type="button" onClick={remove} className="rounded-md px-2 py-1 text-[13px] font-semibold text-primary-700 hover:bg-primary-50">
              Xoá mã
            </button>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">{workStyle ? "So với mini-test của bạn" : "Ý nghĩa từng chữ cái"}</h3>
            <ul className="mt-2 space-y-2">
              {compareMbti(current, workStyle?.scores ?? null).map((r) => {
                const s = STATUS_ICON[r.status];
                return (
                  <li key={r.letter} className="flex gap-2.5">
                    <s.Icon className={cn("mt-0.5 size-4 shrink-0", s.cls)} aria-label={s.label} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800">
                        {r.letter} · {r.text}
                      </p>
                      <p className="text-xs text-slate-500">{r.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {workStyle ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">Khác nhau là bình thường: MBTI mô tả tính cách, còn mini-test hỏi về cách bạn thích làm việc.</p>
            ) : (
              <p className="mt-3 text-xs text-slate-600">
                <Link href="/trac-nghiem/phong-cach" className="font-semibold text-primary-700 hover:underline">
                  Làm mini-test phong cách
                </Link>{" "}
                để so sánh với mã MBTI của bạn.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Chưa biết mã của mình? Không sao — Trovio không cần MBTI để gợi ý ngành.</p>
      )}
    </section>
  );
}
