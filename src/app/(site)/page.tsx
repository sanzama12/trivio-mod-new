import Image from "next/image";
import Link from "next/link";
import { LuArrowRight, LuArrowUpRight } from "react-icons/lu";
import { catalogService, programService } from "@/services";
import { admissionTimeline, TIMELINE_SEASON } from "@/domain/admission-reference";
import { HeroSearch } from "@/components/home/hero-search";
import { JourneySteps } from "@/components/home/journey-steps";
import { MajorGroupCard } from "@/components/catalog/major-group-card";

const paths = [
  {
    img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=900&q=70",
    title: "Đã có trường mong muốn",
    desc: "Tra đề án, điểm chuẩn và học phí của đúng trường đó.",
    cta: "Tìm trường",
    href: "/chuong-trinh",
  },
  {
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=70",
    title: "Đã biết ngành yêu thích",
    desc: "So sánh chương trình đào tạo thực tế giữa các trường.",
    cta: "Xem ngành học",
    href: "/nganh",
  },
  {
    img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=70",
    title: "Chưa có định hướng",
    desc: "Lọc theo tổ hợp và điểm của bạn để thu hẹp lựa chọn.",
    cta: "Khám phá ngành",
    href: "/nganh",
  },
];

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
};

export default async function HomePage() {
  const [groups, stats, schools, majors] = await Promise.all([
    catalogService.getGroupsWithCounts(),
    programService.stats(),
    catalogService.listSchools(),
    catalogService.getMajors(),
  ]);
  const groupNames = new Map(groups.map(({ group }) => [group.id, group.name]));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = admissionTimeline.filter((e) => (e.end ?? e.start) >= today).slice(0, 6);

  return (
    <>
      {/* Banner tràn màn hình */}
      <section className="relative isolate z-40 overflow-visible bg-slate-950">
        <Image
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=75"
          alt="Sân trường đại học mùa tuyển sinh"
          fill
          priority
          className="object-cover opacity-90"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-slate-950/10 to-transparent" />
        <div className="container-page relative py-16 sm:py-24 lg:py-32">
          <p className="inline-flex items-center gap-2 bg-accent-500 px-3 py-1 text-[13px] font-black text-slate-900">
            Tuyển sinh {TIMELINE_SEASON} · {stats.schools.toLocaleString("vi-VN")} trường · {stats.programs.toLocaleString("vi-VN")} chương trình
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl leading-[1.02] font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Biết điểm, chọn ngành.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
            Nhập điểm một lần. Trovio xếp chương trình theo An toàn, Vừa sức, Thử sức.
          </p>
          <div className="mt-8 max-w-2xl rounded-2xl bg-white p-3 shadow-2xl sm:p-4">
            <HeroSearch
              groups={groups.map(({ group, majorCount }) => ({ ...group, majorCount }))}
              schools={schools.map(({ id, name, shortName, code, logoUrl, slug, region, city, type, highlight }) => ({
                id, name, shortName, code, logoUrl, slug, region, city, type, highlight,
              }))}
              majors={majors.map(({ id, name, code, slug, groupId }) => ({
                id, name, code, slug, groupId, groupName: groupNames.get(groupId),
              }))}
            />
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Bắt đầu nhanh: <Link href="/diem-cua-toi" className="font-bold text-accent-200 underline underline-offset-4">nhập điểm</Link> rồi xem <Link href="/chuong-trinh" className="font-bold text-accent-200 underline underline-offset-4">chương trình phù hợp</Link>.
          </p>
        </div>
      </section>

      {/* Ba lối đi: thẻ ảnh lớn */}
      <section className="container-page py-12 lg:py-16" aria-labelledby="loi-di">
        <h2 id="loi-di" className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          Bạn đang ở đâu?
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {paths.map((p) => (
            <Link key={p.title} href={p.href} className="group relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-slate-900">
              <Image src={p.img} alt="" width={900} height={600} className="h-64 w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-70 md:h-72" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="block text-lg font-black text-white">{p.title}</span>
                <span className="mt-1 block text-sm text-slate-200">{p.desc}</span>
                <span className="mt-3 inline-flex h-10 items-center gap-1.5 bg-white px-4 text-sm font-bold text-slate-900 group-hover:bg-accent-500">
                  {p.cta} <LuArrowUpRight className="size-4" aria-hidden />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Dải lịch mốc: cuộn ngang */}
      <section className="border-y-2 border-slate-900 bg-accent-100" aria-labelledby="lich-moc">
        <div className="container-page py-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="lich-moc" className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Lịch mốc sắp tới
            </h2>
            <Link href="/moc-tuyen-sinh" className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:underline">
              Toàn bộ lịch <LuArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
            {upcoming.map((e) => (
              <Link key={e.id} href="/moc-tuyen-sinh" className="w-60 shrink-0 border-2 border-slate-900 bg-white p-4 hover:bg-slate-900 hover:text-white">
                <p className="text-2xl font-black tabular-nums">{fmtDay(e.start)}</p>
                <p className="mt-1 line-clamp-3 min-h-12 text-[13px] leading-snug font-medium">{e.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Giữ nguyên chức năng lộ trình + gợi ý */}
      <JourneySteps />

      {/* Danh mục nhóm ngành: dữ liệu thật, không lặp ảnh trang trí */}
      <section className="border-y border-slate-200 bg-white" aria-labelledby="nhom-nganh">
        <div className="container-page py-14 lg:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-primary-700 uppercase">Bản đồ lựa chọn</p>
              <h2 id="nhom-nganh" className="mt-2 max-w-xl text-3xl leading-tight font-black tracking-tight text-slate-950">
                Bắt đầu từ nhóm ngành gần với bạn
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Xem phạm vi từng nhóm, số ngành, số chương trình và các trường đang đào tạo trước khi đi vào chi tiết.
              </p>
            </div>
            <Link href="/nganh" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-primary-700 hover:underline">
              Mở toàn bộ danh mục <LuArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {groups.filter(({ group }) => group.featured !== false).map((summary, index) => (
              <MajorGroupCard
                key={summary.group.id}
                summary={summary}
                index={index}
                href={`/nganh?group=${summary.group.id}#danh-sach`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Chân sổ */}
      <section className="bg-slate-950 text-slate-200">
        <div className="container-page grid gap-6 py-10 text-sm sm:grid-cols-3">
          <p><strong className="text-white">Nguồn rõ ràng.</strong> Mỗi chương trình ghi đề án và ngày kiểm tra.</p>
          <p><strong className="text-white">Không cam kết đỗ.</strong> Điểm chuẩn 3 năm chỉ để tham khảo.</p>
          <p><strong className="text-white">Không quảng cáo.</strong> Gợi ý chạy bằng thuật toán. <Link href="/cach-goi-y" className="font-bold text-accent-200 underline underline-offset-4">Cách gợi ý</Link></p>
        </div>
      </section>
    </>
  );
}
