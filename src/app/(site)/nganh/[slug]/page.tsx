import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RIASEC_INFO } from "@/domain/riasec";
import { catalogService, programService } from "@/services";
import { formatScore, formatTuition } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/misc";
import { RiasecPill } from "@/components/riasec/riasec-pill";
import { MajorStyleCard } from "@/components/work-style/style-bits";
import { SaveButton } from "@/components/program/program-actions";
import { SchoolCode } from "@/components/program/program-card";

const groupImages: Record<string, string> = {
  "cntt": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2000&q=70",
  "kinh-te": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=2000&q=70",
  "y-duoc": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2000&q=70",
  "ky-thuat": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=2000&q=70",
  "xa-hoi": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=2000&q=70",
  "nghe-thuat": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=2000&q=70",
  "giao-duc": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=2000&q=70",
  "nong-lam": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=70",
};
const fallbackImg = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=2000&q=70";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await catalogService.getMajorBySlug((await params).slug);
  return { title: data ? `Ngành ${data.major.name}` : "Không tìm thấy ngành" };
}

export default async function MajorPage({ params }: Props) {
  const data = await catalogService.getMajorBySlug((await params).slug);
  if (!data) notFound();
  const { major, group } = data;
  const programs = await programService.listByMajor(major.id);

  return (
    <>
      {/* Banner tràn màn hình */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <Image
          src={groupImages[major.groupId] ?? fallbackImg}
          alt=""
          fill
          priority
          className="object-cover opacity-70"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent" />
        <div className="container-page relative py-14 sm:py-20">
          <div className="max-w-2xl">
            <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành", href: "/nganh" }, { label: group.name, href: `/nganh?group=${group.id}` }, { label: major.name }]} />
            <p className="mt-6 inline-flex items-center gap-2 bg-accent-500 px-3 py-1 text-[13px] font-black text-slate-900">
              {group.name} · Mã ngành {major.code}
            </p>
            <h1 className="mt-5 text-4xl leading-[1.02] font-black tracking-tight text-white sm:text-5xl">
              Ngành {major.name}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200">
              {major.description}
            </p>
            <p className="mt-4 inline-flex bg-white px-3 py-1.5 text-sm font-black text-slate-900">
              {programs.length} chương trình đào tạo
            </p>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-6 py-12 lg:grid-cols-2">
        <section className="border-2 border-slate-900 bg-white p-5">
          <p className="text-xs font-bold tracking-wider text-accent-700 uppercase">Sở thích nghề nghiệp</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Mã RIASEC</h2>
          <p className="mt-1 text-[13px] text-slate-600 break-words">Ngành {major.name} phù hợp với người có xu hướng:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {major.riasec.map((t) => (
              <RiasecPill key={t} type={t} />
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {major.riasec.map((t) => (
              <li key={t} className="text-[13px] break-words">
                <strong className="text-slate-900">
                  {t} – {RIASEC_INFO[t].label}:
                </strong>{" "}
                <span className="text-slate-600">{RIASEC_INFO[t].desc}</span>
              </li>
            ))}
          </ul>
        </section>
        <MajorStyleCard major={{ slug: major.slug, groupId: major.groupId, name: major.name }} />
      </div>

      <section className="container-page pb-16">
        <p className="text-xs font-bold tracking-wider text-accent-700 uppercase">Danh sách khuyến dùng</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h2 className="max-w-xl text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Các trường đào tạo ngành {major.name}</h2>
          <span className="text-sm text-slate-600 break-words">
            Tìm thấy <strong className="text-slate-900">{programs.length}</strong> chương trình
          </span>
        </div>
        <div className="mt-6 space-y-3">
          {programs.map(({ program, school }) => (
            <article key={program.id} className="flex flex-col gap-4 border-2 border-slate-900 bg-white p-4 md:flex-row md:items-center">
              <SchoolCode code={school.code} />
              <div className="min-w-0 flex-1">
                <Link href={`/chuong-trinh/${program.slug}`} className="font-bold break-words text-slate-900 hover:underline">
                  {school.name}
                </Link>
                <p className="text-[13px] text-slate-600 break-words">
                  {program.name} · {school.city}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
                <span className="break-words">
                  Điểm chuẩn {program.cutoffs[0]?.year ? `${program.cutoffs[0].year}: ` : ""}{" "}
                  <strong className="bg-slate-900 px-1.5 py-0.5 text-white">{program.cutoffs.length ? formatScore(program.cutoffs[0].score) : "Chưa có dữ liệu chính thức"}</strong>
                </span>
                <span className="break-words">
                  Học phí: <strong className="text-slate-900">{formatTuition(program.tuitionMin, program.tuitionMax)}</strong>
                </span>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
                <SaveButton id={program.id} />
                <Link href={`/chuong-trinh/${program.slug}`} className={buttonClass({ size: "sm" })}>
                  Xem chi tiết chương trình
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
