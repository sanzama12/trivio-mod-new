"use client";

/**
 * Tour hướng dẫn 6 bước do trợ lý dẫn.
 * - Chỉ tự mở ở lần đầu vào trang chủ (lưu "đã xem" trên trình duyệt).
 * - "Bỏ qua" có ngay từ bước 1; Esc cũng đóng. Mở lại: nút ở /tro-giup hoặc /?tour=1.
 * - Không tìm thấy phần tử (VD menu đã thu gọn trên điện thoại) → hiện hộp thoại giữa màn hình.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { LuArrowLeft, LuArrowRight, LuBotMessageSquare, LuX } from "react-icons/lu";
import { readConsent } from "@/lib/consent";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export const TOUR_DONE_KEY = "trovio:tour-done";
export const TOUR_EVENT = "trovio:start-tour";

interface TourStep {
  target: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  { target: null, title: "Chào bạn, mình là trợ lý Trovio", body: "Mình sẽ chỉ bạn 5 chỗ quan trọng trong khoảng 1 phút. Bạn có thể bỏ qua bất cứ lúc nào." },
  { target: "search", title: "Tìm chương trình", body: "Gõ tên trường, ngành hoặc mã chương trình. Thử “Marketing Hà Nội” — Trovio hiện điểm chuẩn 3 năm, học phí và mức An toàn / Vừa sức / Thử sức với điểm của bạn." },
  { target: "nav-quiz", title: "Trắc nghiệm sở thích", body: "7–10 phút để khám phá mã RIASEC 3 chữ cái và các ngành đáng tìm hiểu. Kết quả chỉ lưu trên trình duyệt, không ảnh hưởng xếp hạng chương trình. Không hỏi ngày sinh hay cung hoàng đạo." },
  { target: "for-you", title: "Nhãn khả năng & gợi ý có lý do", body: "Mỗi gợi ý ghi rõ vì sao. Nhãn được tính từ điểm của bạn và điểm chuẩn gần nhất theo phương thức xét tuyển phù hợp." },
  { target: "saved", title: "Lưu & lập nguyện vọng", body: "Bấm biểu tượng trái tim để lưu, rồi sắp xếp nguyện vọng, kiểm tra chiến lược và gửi link chỉ xem cho phụ huynh." },
  { target: "chat", title: "Hỏi trợ lý bất cứ lúc nào", body: "Hỏi về ngành, điểm chuẩn và học phí. Câu trả lời luôn kèm nguồn. Chúc bạn chọn đúng ngành!" },
];

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(name: string | null): HTMLElement | null {
  if (!name) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return els.find((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden") ?? null;
}

export function GuidedTour() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setStep(null);
    try { sessionStorage.setItem("trovio:tour-session", "done"); } catch {}
    window.dispatchEvent(new Event("trovio:tour-changed"));
    try {
      window.localStorage.setItem(TOUR_DONE_KEY, new Date().toISOString());
    } catch {
      /* bỏ qua */
    }
  }, []);

  // Tour tự động chờ người dùng chọn cookie; mở chủ động vẫn hoạt động ngay.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer) { clearTimeout(timer); timer = undefined; }
      try { sessionStorage.setItem("trovio:tour-session", "running"); } catch {}
      window.dispatchEvent(new Event("trovio:tour-changed"));
      setStep(0);
    };
    const maybeStart = () => {
      if (pathname !== "/" || readConsent() === null) return;
      try {
        if (!localStorage.getItem(TOUR_DONE_KEY) && !timer) timer = setTimeout(start, 900);
      } catch { /* Không tự mở khi bộ nhớ bị chặn. */ }
    };
    window.addEventListener(TOUR_EVENT, start);
    window.addEventListener("trovio:consent-changed", maybeStart);
    if (pathname === "/" && params.get("tour") === "1") {
      start();
      router.replace("/", { scroll: false });
    } else maybeStart();
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(TOUR_EVENT, start);
      window.removeEventListener("trovio:consent-changed", maybeStart);
    };
  }, [pathname, params, router]);

  // Định vị vùng sáng quanh phần tử của bước hiện tại.
  useLayoutEffect(() => {
    if (step == null) return;
    const el = findTarget(TOUR_STEPS[step].target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "auto" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  useEffect(() => {
    if (step == null) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStep((s) => (s == null ? s : Math.min(TOUR_STEPS.length - 1, s + 1)));
      if (e.key === "ArrowLeft") setStep((s) => (s == null ? s : Math.max(0, s - 1)));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, close]);

  if (step == null) return null;
  const s = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;

  // Đặt hộp hướng dẫn dưới (hoặc trên) vùng sáng; màn hẹp thì nằm dưới đáy.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const W = Math.min(420, vw - 24);
  let pos: CSSProperties = { left: (vw - W) / 2, top: Math.max(16, vh / 2 - 140), width: W };
  if (rect && vw >= 640) {
    const below = rect.top + rect.height + 16;
    const top = below + 220 < vh ? below : Math.max(16, rect.top - 236);
    pos = { width: W, top, left: Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), vw - W - 12) };
  } else if (rect) {
    pos = { width: W, left: (vw - W) / 2, bottom: 16 };
  }

  return (
    <div className="fixed inset-0 z-[80]" data-print-hide>
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-2xl ring-4 ring-primary-200 transition-all duration-200"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)" }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-slate-900/60" />
      )}
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed rounded-2xl bg-white p-5 shadow-2xl outline-none"
        style={pos}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white" aria-hidden>
            <LuBotMessageSquare className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Trợ lý Trovio</p>
            <p className="text-xs font-medium text-primary-600">
              Bước {step + 1}/{TOUR_STEPS.length} · {s.title}
            </p>
          </div>
          <button type="button" onClick={close} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng hướng dẫn">
            <LuX className="size-[18px]" aria-hidden />
          </button>
        </div>
        <h2 id="tour-title" className="sr-only">
          {s.title}
        </h2>
        <p id="tour-body" className="mt-3 text-sm leading-relaxed text-slate-700 max-w-prose">
          {s.body}
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={cn("h-2 rounded-full", i === step ? "w-5 bg-primary-600" : i < step ? "w-2 bg-primary-600" : "w-2 bg-slate-200")} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={close} className="flex-1 text-left text-sm font-semibold text-slate-600 hover:text-slate-700">
            {last ? "" : "Bỏ qua hướng dẫn"}
          </button>
          {step > 0 && (
            <Button size="sm" variant="outline" onClick={() => setStep(step - 1)}>
              <LuArrowLeft className="size-4" aria-hidden /> Quay lại
            </Button>
          )}
          <Button size="sm" onClick={() => (last ? close() : setStep(step + 1))}>
            {step === 0 ? "Bắt đầu" : last ? "Xong" : "Tiếp theo"} {!last && <LuArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Nút mở lại tour (trang Trợ giúp). */
export function RestartTourButton() {
  const router = useRouter();
  return (
    <Button variant="outline" size="sm" onClick={() => router.push("/?tour=1")}>
      Xem lại hướng dẫn 6 bước
    </Button>
  );
}
