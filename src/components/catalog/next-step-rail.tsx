import Link from "next/link";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBuilding2,
  LuCompass,
  LuSparkles,
} from "react-icons/lu";
import styles from "./next-step-rail.module.css";
import { cn } from "@/lib/cn";

/* Hướng thiết kế khác hẳn khối glass-card cũ:
 * — nền tối sâu + grain + grid kỹ thuật + watermark mũi tên
 * — danh sách dạng "rail" hairline đánh số 01/02/03, hover trượt + arrow hiện
 * — chỉ một điểm nhấn màu dạ quang (nút + số thứ tự hover)
 * — meta rail dưới cùng thay vì 3 thẻ rời */

type Row = {
  href: string;
  index: string;
  title: string;
  desc: string;
  icon: typeof LuBuilding2;
};

const rows: Row[] = [
  {
    href: "/truong",
    index: "01",
    title: "Danh mục trường đại học & học viện",
    desc: "Thông tin tuyển sinh, cơ sở vật chất, địa chỉ và học phí trên toàn quốc.",
    icon: LuBuilding2,
  },
  {
    href: "/chuong-trinh",
    index: "02",
    title: "Chương trình đào tạo theo điểm & tổ hợp",
    desc: "Lọc theo mức điểm, tổ hợp môn thi và học phí để thu hẹp lựa chọn.",
    icon: LuCompass,
  },
];

export function NextStepRail({ schoolCount }: { schoolCount: number }) {
  return (
    <section className={cn(styles.shell, styles.grain, styles.grid)} aria-labelledby="next-step-title">
      <span className={styles.watermark} aria-hidden>→</span>

      <div className="relative grid gap-12 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-14 lg:py-14">
        {/* Cột trái: nhãn + statement + actions */}
        <div>
          <div className="flex items-center gap-3">
            <span className={cn("size-1.5 rounded-full bg-accent-500", styles.pulse)} aria-hidden />
            <span className="text-[11px] font-extrabold tracking-[.24em] text-teal-100/70 uppercase">
              Bước tiếp theo · sau khi chọn ngành
            </span>
          </div>

          <h2
            id="next-step-title"
            className="mt-5 text-[1.85rem] leading-[1.14] font-black tracking-[-.035em] text-white sm:text-4xl lg:text-[2.6rem]"
          >
            Chọn được ngành rồi,
            <br />
            <span className="text-teal-100/55">giờ chọn nơi để học.</span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-7 text-teal-100/65 sm:text-[15px]">
            Cùng một ngành nhưng mỗi trường có thế mạnh, môi trường thực tập và mức học phí khác nhau. Chọn đúng nơi học quan trọng không kém chọn ngành.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/truong"
              className={cn(
                styles.accentBtn,
                "inline-flex items-center gap-2.5 rounded-xl bg-accent-500 px-5 py-3.5 text-sm font-extrabold text-slate-950",
              )}
            >
              <LuBuilding2 className="size-4" aria-hidden />
              Khám phá danh mục trường
              <LuArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/chuong-trinh"
              className={cn(
                styles.ghostBtn,
                "inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3.5 text-sm font-bold text-teal-50 hover:border-white/35 hover:bg-white/10",
              )}
            >
              <LuCompass className="size-4 text-teal-100/80" aria-hidden />
              Tìm chương trình
            </Link>
          </div>

          {/* meta rail — số liệu thay cho mô tả dài */}
          <div className={styles.meta}>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{schoolCount.toLocaleString("vi-VN")}</span>
              <span className="text-[11px] font-bold tracking-[.14em] text-teal-100/55 uppercase">trường</span>
            </span>
            <span className="h-3 w-px bg-white/15" aria-hidden />
            <span className="inline-flex items-baseline gap-2">
              <span className="text-xl font-black text-white">4</span>
              <span className="text-[11px] font-bold tracking-[.14em] text-teal-100/55 uppercase">phương thức xét</span>
            </span>
            <span className="h-3 w-px bg-white/15" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[.14em] text-teal-100/55 uppercase">
              <LuSparkles className="size-3.5 text-accent-500" aria-hidden />
              Miễn phí
            </span>
          </div>
        </div>

        {/* Cột phải: rail hairline đánh số */}
        <div className="relative">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-[.2em] text-teal-100/40 uppercase">
            <span>Đi tiếp</span>
            <span className="hidden sm:block">03 bước</span>
          </div>

          <div className="border-t border-white/10">
            {rows.map(({ href, index, title, desc, icon: Icon }) => (
              <Link key={href} href={href} className={cn(styles.row, "group")}>
                <span className={styles.index}>{index}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-teal-100/45 transition-colors group-hover:text-accent-500" aria-hidden />
                    <span className="text-[15px] leading-snug font-bold text-white transition-colors">{title}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-teal-100/50">{desc}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={styles.rowArrow}>
                    <LuArrowUpRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
