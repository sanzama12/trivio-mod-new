import type { Metadata } from "next";
import Link from "next/link";
import { LuTrendingUp } from "react-icons/lu";
import { trendService, type ProgramTrendRow } from "@/services";
import { Breadcrumb, EmptyState, StatTile } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Xu hướng điểm chuẩn",
  description: "Biến động điểm chuẩn điểm thi THPT của các ngành và chương trình qua nhiều năm, để tham khảo khi chọn trường.",
};
export const dynamic = "force-dynamic";

const fmt = (n: number) => Math.abs(n).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(n)}` : "0");
const tone = (n: number) => (n > 0 ? "text-danger-700" : n < 0 ? "text-success-700" : "text-slate-600");

function ProgramList({ title, rows, empty }: { title: string; rows: ProgramTrendRow[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label={title}>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{empty}</p>
      ) : (
        <ol className="mt-3 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.programId} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link href={`/chuong-trinh/${r.slug}`} className="block truncate font-semibold text-slate-900 hover:text-primary-700 hover:underline">{r.name}</Link>
                <p className="truncate text-xs text-slate-600">{r.schoolName} · {r.years} năm dữ liệu · mới nhất {r.latestYear}: {fmt(r.latestScore)}</p>
              </div>
              <span className={cn("shrink-0 text-sm font-bold tabular-nums", tone(r.totalChange))}>{signed(r.totalChange)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function CutoffTrendPage() {
  const { programs, majors } = await trendService.report();
  const rising = programs.filter((p) => p.direction === "tang").sort((a, b) => b.totalChange - a.totalChange);
  const falling = programs.filter((p) => p.direction === "giam").sort((a, b) => a.totalChange - b.totalChange);
  const stable = programs.filter((p) => p.direction === "on-dinh").length;
  const majorRows = [...majors].sort((a, b) => Math.abs(b.averageChange) - Math.abs(a.averageChange)).slice(0, 12);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Xu hướng điểm chuẩn" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Xu hướng điểm chuẩn</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        Mức tăng giảm điểm chuẩn điểm thi THPT (thang 30) giữa năm sớm nhất và năm mới nhất có dữ liệu. Đây là biến động đã xảy ra để bạn tham khảo, không phải dự đoán điểm chuẩn năm sau.
      </p>

      {programs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={<LuTrendingUp />} title="Chưa đủ dữ liệu để phân tích xu hướng" description="Cần điểm chuẩn của ít nhất 2 năm ở cùng một chương trình. Bạn vẫn có thể xem điểm chuẩn từng chương trình.">
            <ButtonLink href="/chuong-trinh">Tìm chương trình</ButtonLink>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatTile label="Chương trình có thể so sánh" value={programs.length} tone="primary" />
            <StatTile label="Điểm chuẩn tăng" value={rising.length} />
            <StatTile label="Điểm chuẩn giảm" value={falling.length} />
            <StatTile label="Gần như không đổi" value={stable} />
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Biến động theo ngành">
            <h2 className="text-base font-bold text-slate-900">Biến động theo ngành</h2>
            <p className="mt-1 text-sm text-slate-600">Mức thay đổi trung bình của các chương trình thuộc ngành (điểm).</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <caption className="sr-only">Mức thay đổi điểm chuẩn trung bình theo ngành</caption>
                <thead className="border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Ngành</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Chương trình</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Tăng / giảm</th>
                    <th scope="col" className="py-2 text-right font-medium">Thay đổi trung bình</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {majorRows.map((m) => (
                    <tr key={m.majorId}>
                      <td className="py-2.5 pr-3"><Link href={`/nganh/${m.slug}`} className="font-semibold text-slate-900 hover:text-primary-700 hover:underline">{m.name}</Link></td>
                      <td className="py-2.5 pr-3 tabular-nums text-slate-700">{m.programs}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-slate-700">{m.rising} tăng · {m.falling} giảm</td>
                      <td className={cn("py-2.5 text-right font-bold tabular-nums", tone(m.averageChange))}>{signed(m.averageChange)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ProgramList title="Chương trình điểm chuẩn tăng nhiều nhất" rows={rising.slice(0, 8)} empty="Chưa có chương trình nào tăng điểm chuẩn." />
            <ProgramList title="Chương trình điểm chuẩn giảm nhiều nhất" rows={falling.slice(0, 8)} empty="Chưa có chương trình nào giảm điểm chuẩn." />
          </div>
        </>
      )}
    </div>
  );
}
