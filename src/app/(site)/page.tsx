import Image from "next/image";
import Link from "next/link";
import { LuArrowRight, LuArrowUpRight, LuScanLine, LuChartNoAxesCombined, LuBookmark, LuCheck } from "react-icons/lu";
import { catalogService, programService } from "@/services";
import { HeroSearch } from "@/components/home/hero-search";
import { JourneySteps } from "@/components/home/journey-steps";
import { GroupIcon } from "@/components/ui/group-icon";
import { SchoolMarquee } from "@/components/home/school-marquee";
import { FeaturedBenefits } from "@/components/home/featured-benefits";
import { CommunityTestimonials } from "@/components/home/community-testimonials";
import { PersonalizedSuggestions } from "@/components/search/personalized-suggestions";
import styles from "./landing.module.css";

const steps = [
  { icon: LuScanLine, title: "Hiểu điều bạn muốn.", description: "Khám phá sở thích với trắc nghiệm RIASEC. Nhìn rõ thế mạnh và những hướng đi phù hợp.", href: "/trac-nghiem", action: "Khám phá bản thân" },
  { icon: LuChartNoAxesCombined, title: "Biết mình đang ở đâu.", description: "Lưu điểm, chọn tổ hợp và đối chiếu chương trình theo ba mức: An toàn, Vừa sức, Thử sức.", href: "/diem-cua-toi", action: "Tạo hồ sơ học tập" },
  { icon: LuBookmark, title: "Chọn lối đi của mình.", description: "So sánh lựa chọn, sắp xếp nguyện vọng và chia sẻ kế hoạch với những người bạn tin tưởng.", href: "/da-luu", action: "Lập nguyện vọng" },
];

export default async function HomePage() {
  const [groups, stats, schools, majors] = await Promise.all([
    catalogService.getGroupsWithCounts(), programService.stats(), catalogService.listSchools(), catalogService.getMajors(),
  ]);
  const groupNames = new Map(groups.map(({ group }) => [group.id, group.name]));
  const priorityCodes = ["BKA", "QSB", "KSA", "QST", "TCT", "VGU", "QSC", "QSY", "SPK", "SPS", "IUH", "DCT", "NTT", "DKC", "VLU", "HSU", "UEF", "TDM", "QSA", "SPD", "UMT", "EIU", "DNC", "TTU"];
  const featuredSchools = [
    ...priorityCodes.flatMap(code => schools.filter(school => school.code === code)),
    ...schools.filter(school => !priorityCodes.includes(school.code)),
  ].filter(school => school.logoUrl).slice(0, 24);

  return (
    <div className={styles.landing}>
      <section className="relative isolate z-40 overflow-visible bg-slate-950" aria-labelledby="landing-title">
        <Image src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=75" alt="Sân trường đại học mùa tuyển sinh" fill priority className="object-cover opacity-90" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-slate-950/10 to-transparent" />
        <div className="container-page relative py-16 sm:py-24 lg:py-32">
          <p className="inline-flex items-center gap-2 bg-accent-500 px-3 py-1 text-[13px] font-black text-slate-900">Tuyển sinh {new Date().getFullYear()} · {stats.schools.toLocaleString("vi-VN")} trường · {stats.programs.toLocaleString("vi-VN")} chương trình</p>
          <h1 id="landing-title" className="mt-5 max-w-2xl text-4xl leading-[1.02] font-black tracking-tight text-white sm:text-6xl lg:text-7xl">Biết điểm, chọn ngành.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">Nhập điểm một lần. Trovio xếp chương trình theo An toàn, Vừa sức, Thử sức.</p>
          <div className="mt-8 max-w-2xl rounded-2xl bg-white p-3 shadow-2xl sm:p-4">
          <HeroSearch groups={groups.map(({ group, majorCount }) => ({ ...group, majorCount }))} schools={schools.map(({ id, name, shortName, code, logoUrl, slug, region, city, type, highlight }) => ({ id, name, shortName, code, logoUrl, slug, region, city, type, highlight }))} majors={majors.map(({ id, name, code, slug, groupId }) => ({ id, name, code, slug, groupId, groupName: groupNames.get(groupId) }))} />
          </div>
          <p className="mt-4 text-sm text-slate-300">Bắt đầu nhanh: <Link href="/diem-cua-toi" className="font-bold text-accent-200 underline underline-offset-4">nhập điểm</Link> rồi xem <Link href="/chuong-trinh" className="font-bold text-accent-200 underline underline-offset-4">chương trình phù hợp</Link>.</p>
        </div>
      </section>
      <section id="kham-pha" className={`container-page ${styles.searchSection}`} aria-label="Khám phá danh mục tuyển sinh">
        <div className={styles.stats}>
          <p>THÔNG TIN TRONG TẦM TAY<br /><strong>Góc nhìn rộng. Lựa chọn sâu.</strong></p>
          <div><strong>{stats.schools.toLocaleString("vi-VN")}</strong><span>trường trong danh mục</span></div>
          <div><strong>{majors.length.toLocaleString("vi-VN")}</strong><span>ngành để khám phá</span></div>
          <div><strong>{stats.programs.toLocaleString("vi-VN")}</strong><span>chương trình đào tạo</span></div>
        </div>
        <SchoolMarquee schools={featuredSchools.map(({ id, name, code, slug, logoUrl }) => ({ id, name, code, slug, logoUrl }))} />
      </section>

      <section className={`container-page ${styles.journeySection}`} aria-label="Các bước khám phá và lựa chọn">
        <div className={styles.steps}>{steps.map(({ icon: Icon, title, description, href, action }, index) => <Link href={href} className={styles.step} key={href}><div className={styles.stepTop}><Icon aria-hidden /><span>0{index + 1}</span></div><h3>{title}</h3><p>{description}</p><span className={styles.stepLink}>{action}<LuArrowUpRight aria-hidden /></span></Link>)}</div>
      </section>

      <FeaturedBenefits />

      <section className={styles.catalog} aria-labelledby="nhom-nganh"><div className={`container-page ${styles.section}`}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>MỞ RỘNG GÓC NHÌN</span><h2 id="nhom-nganh">Nhiều hướng đi.<br /><span>Một phiên bản của bạn.</span></h2></div><Link href="/nganh" className={styles.textLink}>Tất cả ngành học <LuArrowUpRight aria-hidden /></Link></div>
        <div className={styles.groupGrid}>{groups.filter(({ group }) => group.featured !== false).map(({ group, majorCount, programCount }, index) => <Link href={`/nganh?group=${encodeURIComponent(group.id)}#danh-sach`} key={group.id} className={styles.groupCard}><div className={styles.groupTop}><GroupIcon group={group} /><span>/{String(index + 1).padStart(2, "0")}</span><LuArrowUpRight aria-hidden /></div><h3>{group.name}</h3><p>{majorCount.toLocaleString("vi-VN")} ngành học <span>·</span> {programCount.toLocaleString("vi-VN")} chương trình</p></Link>)}</div>
      </div></section>

      <section className={`container-page ${styles.section} ${styles.method}`} aria-labelledby="method-title">
        <div className={styles.methodVisual} aria-hidden="true"><span className={styles.kicker}>GÓC NHÌN TUYỂN SINH</span><h3>Đặt lựa chọn<br />vào đúng bối cảnh.</h3><div className={styles.fitRow}><span /><strong>An toàn</strong><i /></div><div className={styles.fitRow}><span /><strong>Vừa sức</strong><i /></div><div className={styles.fitRow}><span /><strong>Thử sức</strong><i /></div><p>Tham khảo theo hồ sơ và điểm chuẩn</p></div>
        <div className={styles.methodCopy}><span className={styles.kicker}>CƠ SỞ CHO MỖI QUYẾT ĐỊNH</span><h2 id="method-title">Tự tin hơn.<br />Vì bạn hiểu rõ hơn.</h2><p>Đặt điểm số cạnh thông tin ngành học, học phí và phương thức xét tuyển. Cân nhắc điều phù hợp với mình trước khi sắp xếp nguyện vọng.</p><ul><li><LuCheck aria-hidden /> So sánh chương trình trong cùng một góc nhìn</li><li><LuCheck aria-hidden /> Xem lịch sử điểm chuẩn và nguồn tham khảo</li><li><LuCheck aria-hidden /> Kết hợp năng lực với sở thích cá nhân</li></ul><Link href="/cach-goi-y" className={styles.textLink}>Tìm hiểu cách Trovio gợi ý <LuArrowUpRight aria-hidden /></Link><small>Các mức gợi ý là thông tin tham khảo, không phải cam kết trúng tuyển.</small></div>
      </section>
      <CommunityTestimonials />
      <PersonalizedSuggestions />
      <div className={`container-page ${styles.progress}`}><details><summary>Tiếp tục lộ trình chọn ngành của bạn <LuArrowRight aria-hidden /></summary><JourneySteps /></details></div>
      <section className={`container-page ${styles.finalSection}`} aria-labelledby="start-title"><div className={styles.finalCard}><div className={styles.finalRings} aria-hidden="true" /><span className={styles.eyebrow}>CHƯƠNG TIẾP THEO LÀ CỦA BẠN</span><h2 id="start-title">Tương lai không chỉ để nghĩ.<br /><span>Mà để bắt đầu.</span></h2><p>Một bước hôm nay. Một hướng đi rõ hơn ngày mai.</p><Link href="/trac-nghiem" className={styles.primaryButton}>Khám phá bản thân <LuArrowUpRight aria-hidden /></Link><Link href="/chuong-trinh" className={styles.finalLink}>Mình đã có định hướng <LuArrowRight aria-hidden /></Link></div></section>
    </div>
  );
}
