import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuExternalLink, LuInfo, LuMapPin } from "react-icons/lu";
import { catalogService, programService, SCHOOL_TYPE_LABELS } from "@/services";
import { outcomeService } from "@/services/outcome.service";
import { reviewService } from "@/services/review.service";
import { getCurrentUser } from "@/lib/auth";
import { SourceChip } from "@/components/outcomes/source-chip";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { formatNumber, formatScore, formatTuition } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { SaveButton } from "@/components/program/program-actions";
import { SchoolCode } from "@/components/program/program-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const school = await catalogService.getSchoolBySlug((await params).slug);
  return { title: school?.name ?? "Không tìm thấy trường" };
}

export default async function SchoolPage({ params }: Props) {
  const school = await catalogService.getSchoolBySlug((await params).slug);
  if (!school) notFound();
  const user = await getCurrentUser();
  const [programs, outcome, reviews, mine, sources] = await Promise.all([
    programService.listBySchool(school.id),
    outcomeService.getSchool(school.id),
    reviewService.listPublic(school.id, { viewerId: user?.id }),
    user ? reviewService.mine(user.id, school.id) : null,
    outcomeService.listSources(),
  ]);
  const tt09 = sources.find((x) => x.id === "tt-09-2024");
  const majors = Array.from(new Map(programs.map((v) => [v.major.id, { id: v.major.id, name: v.major.name }])).values());

  const employment = (
    <div className="space-y-4">
      {outcome?.employmentRate ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-[13px] text-slate-500">Tỷ lệ có việc làm{outcome.cohort ? ` · ${outcome.cohort}` : ""}</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{outcome.employmentRate.metric.value}%</p>
            {outcome.employmentRate.metric.note && <p className="mt-1 text-[13px] text-slate-600">{outcome.employmentRate.metric.note}</p>}
            <div className="mt-2">
              <SourceChip source={outcome.employmentRate.source} year={outcome.employmentRate.metric.year} />
            </div>
          </div>
          {outcome.salaryNote && (
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-[13px] text-slate-500">Thu nhập</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{outcome.salaryNote.text}</p>
              <div className="mt-2">
                <SourceChip source={outcome.salaryNote.source} year={outcome.salaryNote.year} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Trovio chưa thu thập được báo cáo khảo sát việc làm của trường. Theo Thông tư 09/2024/TT-BGDĐT, trường phải công khai tỷ lệ người học tốt nghiệp có việc làm trong 12 tháng —
          bạn có thể xem trên website chính thức của trường.
        </p>
      )}
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
        Căn cứ công khai: {tt09 && <SourceChip source={tt09} year={tt09.year} />}
        <a href={school.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
          Website trường <LuExternalLink className="size-3.5" aria-hidden />
        </a>
        <Link href="/viec-lam" className="font-semibold text-primary-600 hover:underline">
          Việc làm theo ngành →
        </Link>
      </p>
    </div>
  );
  const methods = Array.from(new Map(programs.flatMap((v) => v.program.methods).map((m) => [m.name, m])).values());

  const overview = (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
        <p>{school.description}</p>
        <p>
          Trường hiện có {programs.length} chương trình trên Trovio, thuộc{" "}
          {new Set(programs.map((p) => p.major.groupId)).size} nhóm ngành. Website chính thức:{" "}
          <a href={school.website} target="_blank" rel="noreferrer" className="font-semibold text-primary-600 hover:underline">
            {school.website.replace("https://", "")}
          </a>
        </p>
      </div>
      <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        {school.campuses.map((c) => (
          <li key={c} className="flex gap-2 text-slate-700">
            <LuMapPin className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );

  const table = (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Chương trình</th>
            <th scope="col" className="px-4 py-3">Hệ</th>
            <th scope="col" className="px-4 py-3">Tổ hợp</th>
            <th scope="col" className="px-4 py-3 text-right">Điểm chuẩn 2025</th>
            <th scope="col" className="px-4 py-3 text-right">2024</th>
            <th scope="col" className="px-4 py-3 text-right">Học phí/năm</th>
            <th scope="col" className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {programs.map(({ program }) => (
            <tr key={program.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/chuong-trinh/${program.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                  {program.name}
                </Link>
                <span className="block text-xs text-slate-500">{program.admissionCode}</span>
              </td>
              <td className="px-4 py-3 text-slate-600">{program.trainingType}</td>
              <td className="px-4 py-3 text-slate-600">{program.combos.join(", ") || "Học bạ"}</td>
              <td className="px-4 py-3 text-right">
                <span className="rounded-md bg-primary-50 px-2 py-0.5 font-bold text-primary-700">{formatScore(program.cutoffs[0]?.score)}</span>
              </td>
              <td className="px-4 py-3 text-right text-slate-600">{formatScore(program.cutoffs[1]?.score)}</td>
              <td className="px-4 py-3 text-right text-slate-700">{formatTuition(program.tuitionMin, program.tuitionMax)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <SaveButton id={program.id} />
                  <Link href={`/chuong-trinh/${program.slug}`} className="text-[13px] font-semibold text-primary-600 hover:underline">
                    Xem chi tiết
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const admission = (
    <div className="grid gap-3 md:grid-cols-2">
      {methods.map((m) => (
        <div key={m.name} className="rounded-xl border border-slate-200 p-4">
          <p className="font-semibold text-slate-900">{m.name}</p>
          <p className="mt-1.5 text-sm text-slate-600">{m.desc.replace(/ Điểm chuẩn 2025.*$/, "")}</p>
        </div>
      ))}
    </div>
  );

  const tuition = (
    <div className="space-y-4 text-sm text-slate-600">
      <p>
        Học phí dao động từ <strong className="text-slate-900">{Math.min(...programs.map((p) => p.program.tuitionMin))}</strong> đến{" "}
        <strong className="text-slate-900">{Math.max(...programs.map((p) => p.program.tuitionMax))} triệu đồng/năm</strong> tuỳ chương trình.
      </p>
      <p>{school.scholarships}</p>
    </div>
  );

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm chương trình", href: "/chuong-trinh" }, { label: school.shortName }]} />

      <section className="mt-4 rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 p-6 text-white md:p-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <SchoolCode code={school.code} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">{school.name}</h1>
              <Badge tone="success">{SCHOOL_TYPE_LABELS[school.type]}</Badge>
            </div>
            <p className="mt-2 text-sm text-primary-100">
              Mã trường: <strong className="text-white">{school.code}</strong> · Năm thành lập: <strong className="text-white">{school.founded}</strong> · {school.city}
            </p>
          </div>
        </div>
        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
          <div>
            <dd className="text-2xl font-bold">{programs.length}</dd>
            <dt className="text-xs text-primary-100">Chương trình trên Trovio</dt>
          </div>
          <div>
            <dd className="text-2xl font-bold">{formatNumber(school.students)}+</dd>
            <dt className="text-xs text-primary-100">Sinh viên đang học</dt>
          </div>
          <div>
            <dd className="text-2xl font-bold">{school.highlight}</dd>
            <dt className="text-xs text-primary-100">Điểm nổi bật</dt>
          </div>
        </dl>
      </section>

      <Card className="mt-6 p-4 md:p-6">
        <Tabs
          initial={1}
          tabs={[
            { label: "Tổng quan", content: overview },
            { label: "Chương trình đào tạo", content: table },
            { label: "Điều kiện xét tuyển", content: admission },
            { label: "Học phí & Học bổng", content: tuition },
            { label: "Việc làm SV", content: employment },
            {
              label: `Cảm nhận SV${reviews.summary.count ? ` (${reviews.summary.count})` : ""}`,
              content: (
                <ReviewsSection
                  schoolId={school.id}
                  schoolName={school.shortName}
                  majors={majors}
                  initial={{ summary: reviews.summary, filtered: reviews.filtered, facets: reviews.facets, items: reviews.items, mine }}
                  viewer={{ loggedIn: !!user, verified: !!user?.verified }}
                />
              ),
            },
          ]}
        />
      </Card>

      <p className="mt-4 flex items-start gap-2 text-[13px] text-slate-500">
        <LuInfo className="mt-0.5 size-4 shrink-0" aria-hidden />
        Điểm chuẩn mang tính tham khảo dựa trên dữ liệu công bố của trường. Thí sinh cần kiểm tra trên cổng tuyển sinh chính thức.
      </p>
    </div>
  );
}
