import type { Metadata } from "next";
import Link from "next/link";
import { FIT_LABELS, programService, timelineService } from "@/services";
import { formatScore, formatTuition } from "@/lib/format";
import { formatRange } from "@/lib/timeline";
import { ZaloReminder } from "./zalo-reminder";

export const metadata: Metadata = {
  title: "Trovio bản nhẹ – cho mạng yếu",
  description: "Tra cứu điểm chuẩn, học phí và mốc tuyển sinh với trang siêu nhẹ, không ảnh, tải nhanh trên mạng 3G.",
};

type Props = { searchParams: Promise<{ q?: string; diem?: string }> };

const FIT_CLS: Record<string, string> = { "an-toan": "bg-success-50 text-success-700", "vua-suc": "bg-primary-50 text-primary-700", "thu-suc": "bg-accent-50 text-accent-700" };

/**
 * Trang "bản nhẹ" (Lite): render hoàn toàn ở máy chủ, không ảnh, không widget chat/tour; form GET thuần
 * nên dùng được cả khi JavaScript chưa tải xong. Cũng là nền cho Zalo Mini App ở giai đoạn sau.
 */
export default async function LitePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 60).trim();
  const raw = Number((sp.diem ?? "").replace(",", "."));
  const score = Number.isFinite(raw) && raw > 0 && raw <= 30 ? Math.round(raw * 100) / 100 : undefined;
  const [{ items, total }, timeline] = await Promise.all([
    programService.search({ q: q || undefined, score, sort: score ? "phu-hop" : undefined, pageSize: 15, page: 1 }),
    timelineService.list(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = timeline.events.filter((e) => (e.end ?? e.start) >= today).slice(0, 5);
  const searched = !!q || score !== undefined;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-white text-[15px] text-slate-800">
      <header className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 text-sm text-white">
        <p className="font-semibold">
          Trovio <span className="font-normal text-slate-300">· bản nhẹ</span>
        </p>
        <Link href="/" className="text-slate-200 underline">
          Bản đầy đủ
        </Link>
      </header>
      <div className="px-4 py-5">
      <h1 className="text-xl font-bold">{searched && q ? `Điểm chuẩn: ${q}` : "Tra cứu nhanh khi mạng yếu"}</h1>
      {score !== undefined && <p className="text-sm text-slate-600">Điểm của bạn: {String(score).replace(".", ",")} (thi THPT)</p>}
      <p className="mt-1 text-sm text-slate-500">Không ảnh, không hiệu ứng — tải nhanh trên mạng 3G.</p>

      <form method="get" action="/nhe" className="mt-4 space-y-2 rounded-lg border border-slate-300 p-3">
        <label className="block text-sm font-semibold" htmlFor="lite-q">
          Ngành / trường
        </label>
        <input id="lite-q" name="q" defaultValue={q} placeholder="VD: marketing, bách khoa" className="w-full rounded border border-slate-300 px-3 py-2" />
        <label className="block text-sm font-semibold" htmlFor="lite-diem">
          Tổng điểm thi THPT của bạn (không bắt buộc)
        </label>
        <input id="lite-diem" name="diem" inputMode="decimal" defaultValue={score ?? ""} placeholder="VD: 24,5" className="w-full rounded border border-slate-300 px-3 py-2" />
        <button type="submit" className="w-full rounded bg-primary-600 px-3 py-2 font-semibold text-white">
          Tìm
        </button>
      </form>

      {searched && (
        <section className="mt-5" aria-labelledby="lite-results">
          <h2 id="lite-results" className="font-bold">
            {total} chương trình{total > items.length ? ` · hiện ${items.length} đầu tiên` : ""}
          </h2>
          <ol className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
            {items.map((v) => (
              <li key={v.program.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/chuong-trinh/${v.program.slug}`} className="font-semibold text-slate-900 underline decoration-slate-300">
                    {v.school.shortName}
                  </Link>
                  <p className="text-[13px] text-slate-600">
                    {v.program.name} · {v.latestCutoff != null ? `Chuẩn ${v.program.cutoffs[0]?.year ?? ""}: ${formatScore(v.latestCutoff)}` : "Chưa có dữ liệu chính thức"} · {formatTuition(v.program.tuitionMin, v.program.tuitionMax)}
                  </p>
                </div>
                {v.fit && <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${FIT_CLS[v.fit.level]}`}>{FIT_LABELS[v.fit.level]}</span>}
              </li>
            ))}
          </ol>
          {items.length === 0 && <p className="mt-2 text-sm">Không tìm thấy. Thử từ khoá ngắn hơn.</p>}
          {items.length > 0 && (
            <Link href={`/chuong-trinh?${new URLSearchParams({ ...(q ? { q } : {}), ...(score !== undefined ? { score: String(score) } : {}) }).toString()}`} className="mt-2 inline-block text-sm font-semibold text-primary-700">
              Xem bản đầy đủ →
            </Link>
          )}
        </section>
      )}

      <section className="mt-6" aria-labelledby="lite-dates">
        <h2 id="lite-dates" className="font-bold">
          Mốc sắp tới · mùa {timeline.season}
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          {upcoming.map((e) => (
            <li key={e.id}>
              <strong>{formatRange(e)}</strong> — {e.title}
            </li>
          ))}
          {upcoming.length === 0 && <li>Chưa có mốc sắp tới.</li>}
        </ul>
        {!timeline.official && <p className="mt-1 text-xs text-slate-500">Mốc minh hoạ — đối chiếu lịch chính thức của Bộ GD&ĐT.</p>}
        <ZaloReminder text={`Trovio nhắc mốc tuyển sinh ${timeline.season}:\n${upcoming.map((e) => `• ${formatRange(e)}: ${e.title}`).join("\n")}`} />
      </section>

      <nav className="mt-6 border-t border-slate-200 pt-3 text-sm" aria-label="Liên kết nhanh">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-primary-700 underline">
          <li>
            <Link href="/nganh">Khám phá ngành học</Link>
          </li>
          <li>
            <Link href="/mua-diem">Mùa điểm & Plan B</Link>
          </li>
          <li>
            <Link href="/chi-phi#ho-tro">Học bổng, vay vốn</Link>
          </li>
          <li>
            <Link href="/moc-tuyen-sinh">Lịch đầy đủ</Link>
          </li>
        </ul>
      </nav>
      </div>
    </div>
  );
}
