import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuBadgeCheck, LuFileText, LuShieldCheck } from "react-icons/lu";
import type { AdmissionMethodKey, Program, VerifyField } from "@/domain/types";
import { ADMISSION_METHODS, cutoffFor, formatMethodScore, programService, SCHOOL_TYPE_LABELS } from "@/services";
import { CostCalculator } from "@/components/program/cost-calculator";
import { formatMonthVi, formatScore, formatTuition, hasTuitionData } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Breadcrumb, StatTile } from "@/components/ui/misc";
import { CompetitionBadge } from "@/components/program/fit-badge";
import { FitPanel } from "@/components/program/fit-panel";
import { CompareButton, SaveButton, WishlistButton } from "@/components/program/program-actions";
import { CutoffHistory } from "@/components/program/cutoff-history";
import { SchoolCode } from "@/components/program/program-card";
import { QaSection } from "@/components/program/qa-section";
import { FinanceBlock } from "@/components/program/finance-block";
import { verifiedStatus } from "@/services/verification";
import { dataEvidenceFor, resolvedSourceUrl } from "@/services/data-trust.service";
import { DataStatusBadge } from "@/components/ui/data-status-badge";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await programService.getBySlug((await params).slug);
  return { title: detail ? `${detail.program.name} – ${detail.school.shortName}` : "Không tìm thấy chương trình" };
}

const sections = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "tuyen-sinh", label: "Tuyển sinh" },
  { id: "hoc-phi", label: "Học phí" },
  { id: "hoi-sinh-vien", label: "Hỏi sinh viên" },
];

export default async function ProgramDetailPage({ params }: Props) {
  const detail = await programService.getBySlug((await params).slug);
  if (!detail) notFound();
  const { program, school, major, similar } = detail;
  const latest = program.cutoffs[0];
  const verified = verifiedStatus(program);
  const tuitionKnown = hasTuitionData(program.tuitionMin, program.tuitionMax);
  const evidence = Object.fromEntries(
    (["cutoff", "tuition", "quota", "combos"] as VerifyField[]).map((field) => [field, dataEvidenceFor(program, field)]),
  ) as Record<VerifyField, ReturnType<typeof dataEvidenceFor>>;
  const sourceUrl = resolvedSourceUrl(program);
  const fieldMark = (field: VerifyField) => <DataStatusBadge evidence={evidence[field]} className="mt-1" />;

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Tìm chương trình", href: "/chuong-trinh" },
          { label: major.name, href: `/nganh/${major.slug}` },
          { label: school.shortName },
        ]}
      />

      <Card className="mt-4 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <SchoolCode code={school.code} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">
                  {program.name} – {school.shortName}
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  {program.campus} · Mã xét tuyển: <strong className="text-slate-700">{program.admissionCode}</strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {verified.active && (
                  <span
                    title={program.schoolVerifiedNote ?? "Trường đã đối chiếu và xác nhận dữ liệu tuyển sinh"}
                    className="inline-flex items-center gap-1.5 rounded-full border border-success-500 bg-white px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-success-700"
                  >
                    <LuShieldCheck className="size-4" aria-hidden /> Trường đã xác nhận · {verified.dateLabel}
                  </span>
                )}
                <Badge tone="success">Trường {SCHOOL_TYPE_LABELS[school.type].toLowerCase()}</Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="slate">Cập nhật: {formatMonthVi(program.updatedAt)}</Badge>
              <DataStatusBadge evidence={evidence.cutoff} showSource />
              <CompetitionBadge level={program.competition} />
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={latest ? `Điểm chuẩn ${latest.year}` : "Điểm chuẩn"} value={<>{latest ? `${formatScore(latest.score)} điểm` : "Chưa có dữ liệu chính thức"}{fieldMark("cutoff")}</>} tone="primary" />
          <StatTile label="Học phí" value={<>{formatTuition(program.tuitionMin, program.tuitionMax)}{fieldMark("tuition")}</>} />
          <StatTile label="Thời gian đào tạo" value={`${program.durationYears} năm`} />
          <StatTile label="Chỉ tiêu" value={<>{program.quota > 0 ? `${program.quota} sinh viên` : "Chưa có dữ liệu"}{fieldMark("quota")}</>} />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <nav aria-label="Mục trong trang" className="sticky top-16 z-10 -mx-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-1.5 backdrop-blur md:top-20">
            <ul className="flex gap-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-slate-600 hover:bg-primary-50 hover:text-primary-700">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <Card id="tong-quan" className="p-6">
            <h2 className="text-lg font-bold">Tổng quan chương trình</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_240px]">
              <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
                <p>{program.overview}</p>
                <p>{major.description}</p>
              </div>
              <dl className="h-fit rounded-xl bg-slate-50 p-4 text-sm">
                <p className="mb-3 text-xs font-bold tracking-wider text-primary-600 uppercase">Thông tin nhanh</p>
                {[
                  ["Mã xét tuyển", program.admissionCode],
                  ["Mã ngành", major.code],
                  ["Hệ đào tạo", program.trainingType],
                  ["Tổ hợp", program.combos.join(", ") || "Chưa có dữ liệu"],
                  ["Khu vực", school.city],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-200/70 py-2 last:border-0">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          <Card id="tuyen-sinh" className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Tuyển sinh</h2>
              <span className="text-[13px] text-slate-500">{program.methods.length} phương thức</span>
            </div>
            <div className="mt-4 space-y-3">
              {program.methods.map((m) => (
                <div key={m.name} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{m.name}</h3>
                    <Badge tone={m.tag === "Điểm thi" || m.tag === "Học bạ" ? "primary" : m.tag === "Ưu tiên" ? "accent" : "success"}>{m.tag}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{m.desc}</p>
                  <p className="mt-2 text-[13px] text-slate-500">
                    {m.key && (m.key === "thpt" || m.key === "hocba") ? (
                      <MethodRequirement program={program} methodKey={m.key} />
                    ) : (
                      <>
                        Yêu cầu: <strong className="text-slate-800">{m.requirement}</strong>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
            {program.cutoffs.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="mb-3 font-semibold text-slate-900">Điểm chuẩn 3 năm gần nhất</h3>
                <CutoffHistory cutoffs={program.cutoffs} />
              </div>
            )}
          </Card>

          <Card id="hoc-phi" className="p-6">
            <h2 className="text-lg font-bold">Học phí</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatTile label="Học phí / năm" value={formatTuition(program.tuitionMin, program.tuitionMax)} tone="primary" />
              <StatTile
                label={`Tổng theo mức học phí hiện tại · ${program.durationYears} năm`}
                value={tuitionKnown ? `${program.tuitionMin * program.durationYears} – ${program.tuitionMax * program.durationYears} triệu` : "Chưa có dữ liệu học phí"}
              />
            </div>
            {tuitionKnown ? (
              <p className="mt-3 text-xs text-slate-500">Đây là phép nhân từ mức học phí đang lưu, chưa bao gồm điều chỉnh theo lộ trình và các khoản sinh hoạt.</p>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Trovio chưa có dữ liệu học phí cho chương trình này; giá trị trống không được hiểu là miễn học phí.</p>
            )}
            <FinanceBlock school={school} />
            {tuitionKnown && (
              <details className="group mt-5 rounded-xl border border-slate-200">
                <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  Tính tổng chi phí cả khoá (học phí + sinh hoạt phí) <span aria-hidden className="inline-block transition group-open:rotate-90">›</span>
                </summary>
                <div className="border-t border-slate-200 p-4">
                  <CostCalculator tuitionMin={program.tuitionMin} tuitionMax={program.tuitionMax} durationYears={program.durationYears} />
                </div>
              </details>
            )}
          </Card>


          <QaSection programId={program.id} schoolName={school.shortName} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Hành động">
          <FitPanel program={{ cutoffs: program.cutoffs, altCutoffs: program.altCutoffs, combos: program.combos, methods: program.methods }} />
          <Card className="space-y-3 p-5">
            <p className="text-sm font-bold text-slate-900">Hành động của bạn</p>
            <WishlistButton id={program.id} />
            <SaveButton id={program.id} variant="full" />
            <CompareButton id={program.id} full />
          </Card>
          <Card className="border-l-4 border-l-primary-600 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <LuFileText className="size-4 text-primary-600" aria-hidden /> Nguồn dữ liệu & minh bạch
            </p>
            <p className="mt-1 text-xs text-slate-500">Kiểm tra lần cuối: {formatMonthVi(program.updatedAt)}</p>
            {verified.active ? (
              <p className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-success-700">
                <LuBadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Trường đã xác nhận ngày {verified.dateLabel}
                {program.schoolVerifiedNote ? ` · ${program.schoolVerifiedNote}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-slate-500">{verified.expired ? `Xác nhận của trường đã quá 12 tháng (${verified.dateLabel}).` : "Trường chưa xác nhận dữ liệu này."}</p>
            )}
            <div className="mt-3 grid gap-2">
              {(["cutoff", "tuition", "quota", "combos"] as VerifyField[]).map((field) => (
                <div key={field} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-slate-600">{field === "cutoff" ? "Điểm chuẩn" : field === "tuition" ? "Học phí" : field === "quota" ? "Chỉ tiêu" : "Tổ hợp"}</span>
                  <DataStatusBadge evidence={evidence[field]} showSource />
                </div>
              ))}
            </div>            <div className="mt-3 flex flex-col gap-2 text-[13px] font-semibold">
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                  Mở nguồn dữ liệu ↗
                </a>
              ) : null}
              {school.website ? (
                <a href={school.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                  Website của trường ↗
                </a>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Chương trình tương tự tại các trường khác</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {similar.map((v) => (
              <Link
                key={v.program.id}
                href={`/chuong-trinh/${v.program.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary-200 hover:shadow-elevated"
              >
                <div className="flex items-start gap-3">
                  <SchoolCode code={v.school.code} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{v.program.name}</p>
                    <p className="truncate text-[13px] text-slate-500">{v.school.shortName}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-[13px]">
                  <span>
                    <span className="block text-slate-500">Điểm chuẩn {v.program.cutoffs[0]?.year ?? ""}</span>
                    <strong className="text-primary-700">{v.latestCutoff != null ? formatScore(v.latestCutoff) : "Chưa có dữ liệu chính thức"}</strong>
                  </span>
                  <span className="text-right">
                    <span className="block text-slate-500">Học phí</span>
                    <strong className="text-slate-900">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</strong>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Điểm chuẩn hiện hành của phương thức THPT / học bạ. */
function MethodRequirement({ program, methodKey }: { program: Pick<Program, "cutoffs" | "altCutoffs">; methodKey: AdmissionMethodKey }) {
  const cut = cutoffFor(program, methodKey);
  if (!cut) return <>Chưa có điểm chuẩn</>;
  return (
    <>
      Điểm chuẩn {cut.year}:{" "}
      <strong className="text-slate-800">
        {formatMethodScore(cut.score, methodKey)} điểm
      </strong>
    </>
  );
}

