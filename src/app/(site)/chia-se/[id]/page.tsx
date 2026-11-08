import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { LuCircleAlert, LuCircleCheck, LuEye, LuInfo, LuUnlink, LuTriangleAlert } from "react-icons/lu";
import { ADMISSION_METHODS, cutoffFor, evaluateProgramFit, formatMethodScore, profileMethod, shareService } from "@/services";
import { analyzeWishlist, type CheckLevel } from "@/services/wishlist-strategy";
import { formatDateVi, formatTuition } from "@/lib/format";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { FitBadge } from "@/components/program/fit-badge";
import { SchoolCode } from "@/components/program/program-card";
import { ShareCommentForm } from "@/components/share/comment-form";

// Link chứa mã bí mật: không lập chỉ mục, không gửi referrer sang trang khác.
export const metadata: Metadata = {
  title: "Danh sách nguyện vọng được chia sẻ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ id: string }> };

const CHECK_ICON: Record<CheckLevel, { icon: typeof LuInfo; cls: string }> = {
  danger: { icon: LuCircleAlert, cls: "text-danger-500" },
  warning: { icon: LuTriangleAlert, cls: "text-accent-500" },
  info: { icon: LuInfo, cls: "text-primary-600" },
  ok: { icon: LuCircleCheck, cls: "text-success-500" },
};

export default async function SharedWishlistPage({ params }: Props) {
  const { id } = await params;
  const data = await shareService.view(id);

  if (!data) notFound();

  const method = profileMethod(data.profile);
  const report = data.profile ? analyzeWishlist(data.items.map(({ view }) => ({ id: view.program.id, label: view.program.name, program: view.program })), data.profile) : null;

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <LuEye className="size-4 shrink-0 text-primary-600" aria-hidden />
          Chế độ chỉ xem · link hết hạn ngày {formatDateVi(data.expiresAt)}
        </div>

        <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight">Nguyện vọng dự kiến của {data.ownerName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Đây là kế hoạch cá nhân lập trên Trovio, chưa phải đăng ký tuyển sinh chính thức.
          {data.scoreLabel && (
            <>
              {" "}
              Hồ sơ tham chiếu: <strong className="text-slate-800">{data.scoreLabel}</strong>.
            </>
          )}
        </p>

        {report && data.items.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="font-bold text-slate-900">Nhận xét tự động về danh sách</h2>
            <ul className="mt-3 space-y-2.5">
              {report.checks.map((c) => {
                const st = CHECK_ICON[c.level];
                return (
                  <li key={c.id} className="flex gap-2.5">
                    <st.icon className={cn("mt-0.5 size-4 shrink-0", st.cls)} aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                      <p className="text-sm text-slate-600">{c.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          {data.items.length === 0 ? (
            <Card>
              <EmptyState icon={<LuInfo />} title="Danh sách đang trống" description="Người chia sẻ chưa thêm nguyện vọng nào." />
            </Card>
          ) : (
            data.items.map(({ view: v, note }, i) => {
              const evaluated = data.profile ? evaluateProgramFit(data.profile, v.program) : null;
              const fit = evaluated?.fit ?? null;
              const selectedMethod = evaluated?.method ?? method;
              const cut = cutoffFor(v.program, selectedMethod);
              return (
                <Card key={v.program.id} className="p-5">
                  <div className="flex gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-semibold text-white">NV{i + 1}</span>
                    <SchoolCode code={v.school.code} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/chuong-trinh/${v.program.slug}`} className="font-bold text-slate-900 hover:text-primary-700">
                        {v.program.name}
                      </Link>
                      <p className="text-sm text-primary-600">{v.school.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-md bg-primary-50 px-2 py-1 font-semibold text-primary-700">
                          {cut ? `Chuẩn ${cut.year}: ${formatMethodScore(cut.score, selectedMethod)} ${ADMISSION_METHODS[selectedMethod].short}` : `Không xét ${ADMISSION_METHODS[selectedMethod].short}`}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</span>
                        <FitBadge fit={fit} />
                        {evaluated && <span>{evaluated.combo} · {formatMethodScore(evaluated.total, evaluated.method)} điểm</span>}
                      </div>
                      {note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Ghi chú: {note}</p>}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <ShareCommentForm shareId={id} programs={data.items.map(({ view }, i) => ({ id: view.program.id, label: `NV${i + 1}: ${view.program.name} – ${view.school.shortName}` }))} />

        <p className="mt-8 text-center text-xs text-slate-600">
          Thông tin phản ánh dữ liệu Trovio đang có; hãy đối chiếu đề án tuyển sinh và thông báo chính thức của trường.{" "}
          <Link href="/cach-goi-y" className="font-semibold text-primary-600 hover:underline">
            Cách Trovio đánh giá
          </Link>
        </p>
      </div>
    </div>
  );
}
