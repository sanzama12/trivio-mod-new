import type { Metadata } from "next";
import Link from "next/link";
import { LuBookmark, LuCompass, LuSearch, LuX } from "react-icons/lu";
import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { miniService } from "@/services/mini.service";
import { LogoMark } from "@/components/layout/logo";
import { ZaloShare } from "./zalo-share";

/**
 * C3 — bản Mini App (mở trong Zalo / trình duyệt yếu): 3 việc chính, không ảnh, không tài khoản.
 * ?ma=ICE&ten=An → thẻ kết quả bạn bè chia sẻ trong nhóm lớp + nút "Làm trắc nghiệm giống An".
 */
export const metadata: Metadata = {
  title: "Trovio Mini – chọn ngành hợp với bạn",
  description: "Làm trắc nghiệm sở thích, tra điểm chuẩn 3 năm, lưu nguyện vọng — nhẹ, không cần tài khoản.",
  robots: { index: false, follow: true },
};

function parseCode(raw: unknown): RiasecType[] | null {
  const letters = [...new Set(String(raw ?? "").toUpperCase().replace(/[^RIASEC]/g, "").split(""))] as RiasecType[];
  return letters.length === 3 && letters.every((l) => RIASEC_ORDER.includes(l)) ? letters : null;
}
const cleanName = (raw: unknown) => String(raw ?? "").replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);

export default async function ZaloMiniPage({ searchParams }: { searchParams: Promise<{ ma?: string; ten?: string }> }) {
  const { ma, ten } = await searchParams;
  const code = parseCode(ma);
  const name = cleanName(ten) || "bạn";
  const { fit, minutes, questionCount, programCount } = await miniService.overview(code);

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="flex items-center gap-2 text-base font-bold text-slate-900">
            <LogoMark className="size-6" /> Trovio
          </span>
          <span className="flex items-center gap-3 rounded-full border border-slate-300 px-3 py-1 text-slate-700">
            <span aria-hidden className="text-sm leading-none font-bold tracking-widest">•••</span>
            <Link href="/" aria-label="Đóng, về trang Trovio đầy đủ">
              <LuX className="size-4" aria-hidden />
            </Link>
          </span>
        </header>

        <main className="flex-1 px-4 py-5">
          {code && (
            <section aria-labelledby="share-h" className="mb-6 rounded-2xl bg-slate-50 p-3">
              <p id="share-h" className="px-1 text-xs font-semibold text-primary-700">
                {name}
              </p>
              <div className="mt-1.5 rounded-xl bg-primary-900 px-4 py-3 text-white">
                <p className="text-base font-bold">Mã sở thích: {code.join(" · ")}</p>
                <p className="mt-0.5 text-xs text-primary-100">Hợp: {fit.join(", ") || code.map((t) => RIASEC_INFO[t].label).join(", ")}</p>
              </div>
              <Link href="/diem-cua-toi?nguon=zalo" className="mt-2 flex h-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700">
                Nhập điểm xét tuyển
              </Link>
            </section>
          )}

          <h1 className="text-xl font-bold text-slate-900">Chọn ngành hợp với bạn</h1>
          <p className="mt-1.5 text-sm text-slate-600">3 việc làm được ngay, không cần tài khoản.</p>
          <nav aria-label="Việc chính" className="mt-5 space-y-3">
            {[
              { href: "/diem-cua-toi?nguon=zalo", Icon: LuCompass, title: "Nhập điểm THPT hoặc học bạ", sub: "tính tổ hợp mạnh" },
              { href: "/nhe", Icon: LuSearch, title: "Tra điểm chuẩn 3 năm", sub: `${programCount} chương trình` },
              { href: "/da-luu", Icon: LuBookmark, title: "Danh sách nguyện vọng", sub: "lưu trên máy" },
            ].map(({ href, Icon, title, sub }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 hover:border-primary-300 hover:bg-primary-50/40">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{sub}</span>
                </span>
              </Link>
            ))}
          </nav>

          <ZaloShare code={code?.join("") ?? null} name={code ? name : null} />
          <p className="mt-6 text-center text-xs text-slate-500">
            Kết quả lưu tạm trên máy; muốn lưu lâu dài hãy{" "}
            <Link href="/dang-ky" className="font-semibold text-primary-700 underline">
              tạo tài khoản
            </Link>
            . Bản đầy đủ: <Link href="/" className="font-semibold text-primary-700 underline">trovio.vn</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
