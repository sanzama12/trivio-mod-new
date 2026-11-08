"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuClipboardList, LuRotateCcw, LuShare2 } from "react-icons/lu";
import type { Major } from "@/domain/types";
import { matchMajorRiasec, RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ShareCardDialog } from "@/components/share-card/share-card-dialog";
import { RadarChart } from "./radar-chart";
import { RiasecPill, RIASEC_COLORS } from "./riasec-pill";
import { clearRiasecQuiz, isRiasecResultSaved, readRiasecResult, type StoredRiasecResult } from "./quiz-storage";

export type RiasecMajor = Pick<Major, "id" | "slug" | "name" | "riasec" | "groupId">;

export function QuizResult({ majors }: { majors: RiasecMajor[] }) {
  const router = useRouter();
  const toast = useToast();
  const [result, setResult] = useState<StoredRiasecResult | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    setResult(readRiasecResult());
    setSaved(isRiasecResultSaved());
    setReady(true);
  }, []);
  const matches = useMemo(() => result ? majors
    .map((major) => ({ major, match: matchMajorRiasec(result.code, major) }))
    .sort((a, b) => b.match - a.match || a.major.name.localeCompare(b.major.name, "vi"))
    .slice(0, 8) : [], [majors, result]);

  function restart() {
    const cleared = clearRiasecQuiz();
    setResetOpen(false);
    setResult(null);
    if (!cleared) toast("Đã xoá trong phiên này. Trình duyệt chặn xoá dữ liệu đã lưu; bạn có thể xoá dữ liệu trang trong cài đặt trình duyệt.", "warning");
    router.push("/trac-nghiem/lam-bai");
  }

  return (
    <div className="bg-paper-50 pb-16">
      <div className="container-page py-6 sm:py-8">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm", href: "/trac-nghiem" }, { label: "Kết quả" }]} />
        {!ready ? <p role="status" className="py-12 text-slate-600">Đang mở kết quả…</p> : !result ? (
          <Card className="mx-auto mt-8 max-w-2xl">
            <EmptyState headingAs="h1" icon={<LuClipboardList />} title="Bạn chưa có kết quả trắc nghiệm" description="Làm bài để khám phá những hoạt động bạn thích. Kết quả chỉ lưu trên trình duyệt đã làm bài, không đồng bộ tài khoản.">
              <ButtonLink href="/trac-nghiem/lam-bai">Làm trắc nghiệm<LuArrowRight className="size-4" aria-hidden /></ButtonLink>
            </EmptyState>
          </Card>
        ) : (
          <>
            <section className="mt-6 border-b border-slate-200 pb-8" aria-labelledby="quiz-result-title">
              <h1 id="quiz-result-title" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Sở thích nghề nghiệp của bạn</h1>
              <p className="mt-3 text-sm text-slate-600">{saved ? "Kết quả lưu trên trình duyệt này" : "Kết quả chỉ có trong phiên này — trình duyệt đang chặn lưu"} · làm ngày {new Date(result.completedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} · {result.answered}/{result.total} câu</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                <p aria-label={`Mã RIASEC: ${result.code.join(" ")}`} className="flex gap-2 text-6xl font-bold tracking-tight sm:text-7xl">
                  {result.code.map((type) => <span key={type} className={RIASEC_COLORS[type].text}>{type}</span>)}
                </p>
                <div className="flex flex-wrap gap-2">{result.code.map((type) => <RiasecPill key={type} type={type} />)}</div>
              </div>
              <p className="mt-5 max-w-prose text-base leading-relaxed text-slate-600">Đây là ba nhóm sở thích nổi bật trong bài làm của bạn. Kết quả phản ánh điều bạn thích ở thời điểm hiện tại, không đo năng lực và không phải tính cách cố định.</p>
              {new Set(Object.values(result.scores)).size === 1 && <p className="mt-3 max-w-prose text-sm text-slate-600">Các nhóm đang bằng điểm nhau; mã ba chữ được xếp theo thứ tự R–I–A–S–E–C. Hãy xem cả sáu nhóm và thử thêm hoạt động thực tế để hiểu mình hơn.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#nganh-phu-hop" className={buttonClass()}>Xem các ngành phù hợp<LuArrowRight className="size-4" aria-hidden /></a>
                <Button variant="secondary" onClick={() => setShareOpen(true)}><LuShare2 className="size-4" aria-hidden />Chia sẻ kết quả</Button>
                <Button variant="secondary" onClick={() => setResetOpen(true)}><LuRotateCcw className="size-4" aria-hidden />Làm lại</Button>
              </div>
              {!saved && <p className="mt-3 text-sm text-slate-700">Tải ảnh qua “Chia sẻ kết quả” để giữ lại. Đóng hoặc tải lại trang có thể mất kết quả.</p>}
            </section>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
              <Card className="p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-900">Sáu nhóm sở thích</h2>
                <RadarChart percents={result.percents} />
                <dl className="space-y-4">
                  {RIASEC_ORDER.map((type) => (
                    <div key={type}>
                      <div className="flex justify-between gap-3 text-sm">
                        <dt className="font-medium text-slate-700"><span className={`mr-2 font-bold ${RIASEC_COLORS[type].text}`}>{type}</span>{RIASEC_INFO[type].label}</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">{result.percents[type]}%</dd>
                      </div>
                      <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${RIASEC_COLORS[type].bg}`} style={{ width: `${result.percents[type]}%` }} /></div>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-xs leading-relaxed text-slate-500">Phần trăm thể hiện mức yêu thích so với điểm tối đa của từng nhóm, không phải xác suất thành công hay trúng tuyển. Khi bằng điểm, thứ tự R–I–A–S–E–C được dùng để mã luôn ổn định.</p>
              </Card>
              <section aria-labelledby="top-groups-title">
                <h2 id="top-groups-title" className="text-xl font-bold text-slate-900">Ba nhóm nổi bật nói gì?</h2>
                <ol className="mt-4 divide-y divide-slate-200">
                  {result.code.map((type, index) => (
                    <li key={type} className="py-5 first:pt-0">
                      <div className="flex items-center gap-3"><span className={`text-3xl font-bold ${RIASEC_COLORS[type].text}`}>{type}</span><h3 className="text-lg font-semibold text-slate-900">{index + 1}. {RIASEC_INFO[type].name}</h3></div>
                      <p className="mt-2 text-base leading-relaxed text-slate-600">{RIASEC_INFO[type].desc}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-slate-600">Dùng kết quả làm điểm bắt đầu: đọc chương trình học, thử một hoạt động nhỏ và trao đổi với người đang học hoặc làm nghề. Sở thích có thể thay đổi theo trải nghiệm.</p>
              </section>
            </div>

            <section id="nganh-phu-hop" className="mt-12 scroll-mt-28" aria-labelledby="matched-majors-title">
              <h2 id="matched-majors-title" className="text-2xl font-bold tracking-tight text-slate-900">Các ngành phù hợp để bạn tìm hiểu</h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">Mức khớp dựa trên nhóm ngành; chỉ để tham khảo, không ảnh hưởng gợi ý chương trình. Ba vị trí trong mã của bạn lần lượt có trọng số 3/2/1; ngành có mã riêng được ưu tiên dùng mã đó.</p>
              {matches.length ? (
                <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
                  {matches.map(({ major, match }) => (
                    <li key={major.id} className="border-b border-slate-200">
                      <Link href={`/nganh/${major.slug}`} className="group flex min-h-20 items-center justify-between gap-4 rounded-lg py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600">
                        <span className="min-w-0 font-semibold text-slate-900 group-hover:text-primary-700">{major.name}</span>
                        <span className="flex shrink-0 items-center gap-2"><Badge tone="primary">{match}% khớp</Badge><LuArrowRight className="size-4 text-slate-500 group-hover:text-primary-700" aria-hidden /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-6 text-slate-600">Danh mục ngành chưa có dữ liệu. Kết quả sở thích của bạn vẫn xem được ở trên.</p>}
              <Link href="/nganh" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-700 underline underline-offset-4">Khám phá toàn bộ ngành học<LuArrowRight className="size-4" aria-hidden /></Link>
            </section>
          </>
        )}
      </div>
      <ConfirmDialog open={resetOpen} title="Xoá kết quả và làm lại?" confirmLabel="Xoá và làm lại" onConfirm={restart} onCancel={() => setResetOpen(false)}>
        Kết quả và bản nháp RIASEC trên trình duyệt này sẽ bị xoá. Bạn có thể tải ảnh kết quả trước khi bắt đầu bài mới.
      </ConfirmDialog>
      {shareOpen && result && <ShareCardDialog initial="riasec" data={{ name: null, riasec: { code: result.code, percents: result.percents, topMajors: matches.map(({ major }) => major.name) } }} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
