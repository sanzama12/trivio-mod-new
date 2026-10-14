import Link from "next/link";
import type { ComponentType } from "react";
import { LuAward, LuBuilding2, LuHandCoins, LuShieldCheck } from "react-icons/lu";
import type { FinancialAidConfig, Program, School } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";

const round1 = (n: number) => Math.round(n * 10) / 10;
const vi = (n: number) => String(round1(n)).replace(".", ",");
/** Số tiền nghìn đồng → "550 nghìn" hoặc "2,5 triệu". */
const money = (k: number) => (k < 1000 ? `${Math.round(k)} nghìn` : `${vi(k / 1000)} triệu`);

/**
 * Khối "Tài chính cho việc học" trên trang chương trình (Figma C2): học bổng, miễn giảm, vay vốn, KTX
 * và tổng chi phí ước tính học phí + chỗ ở. Không trừ học bổng/miễn giảm vì phụ thuộc kết quả & đối tượng.
 */
export function FinanceBlock({ program, school, config }: { program: Pick<Program, "tuitionMin" | "tuitionMax" | "durationYears">; school: Pick<School, "type" | "scholarships">; config: FinancialAidConfig | null }) {
  if (!config) return null;
  const dorm = config.dormEstimate[school.type];
  const stayMonthly = dorm ? (dorm.min + dorm.max) / 2 : config.rentEstimate; // nghìn đồng/tháng
  const months = program.durationYears * 12;
  const tuitionTotal = ((program.tuitionMin + program.tuitionMax) / 2) * program.durationYears; // triệu
  const stayTotal = (stayMonthly * months) / 1000; // triệu
  const total = tuitionTotal + stayTotal;
  const policy = (id: string) => config.policies.find((p) => p.id === id)!;

  const cards: { Icon: ComponentType<{ className?: string }>; title: string; text: string; chip: string; tone: "success" | "primary" }[] = [
    { Icon: LuAward, title: "Học bổng", text: school.scholarships || policy("hoc-bong-kk").summary, chip: "Xét theo kết quả học tập", tone: "success" },
    { Icon: LuShieldCheck, title: "Miễn, giảm học phí", text: "Theo đối tượng chính sách của Nhà nước (hộ nghèo, khuyết tật, dân tộc thiểu số…).", chip: "Cần kiểm tra giấy tờ", tone: "primary" },
    { Icon: LuHandCoins, title: "Vay vốn sinh viên", text: "Vay qua Ngân hàng Chính sách xã hội theo quy định hiện hành, trả sau khi ra trường.", chip: "Xem điều kiện", tone: "primary" },
    {
      Icon: LuBuilding2,
      title: "Ký túc xá",
      text: dorm ? `Khoảng ${dorm.max < 1000 ? `${dorm.min}–${dorm.max} nghìn` : `${vi(dorm.min / 1000)}–${vi(dorm.max / 1000)} triệu`}/tháng · ưu tiên tân sinh viên ở xa.` : "Chưa có số liệu ký túc xá — tạm tính theo giá thuê trọ.",
      chip: dorm ? "Đăng ký khi nhập học" : "Hỏi phòng công tác sinh viên",
      tone: dorm ? "success" : "primary",
    },
  ];

  return (
    <section aria-labelledby="tai-chinh" className="mt-6 rounded-xl border border-slate-200 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="tai-chinh" className="font-semibold text-slate-900">
          Tài chính cho việc học
        </h3>
        <Badge tone="accent">Dữ liệu minh hoạ</Badge>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {cards.map(({ Icon, title, text, chip, tone }) => (
          <li key={title} className="rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <Icon className="size-4 text-primary-600" aria-hidden /> {title}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{text}</p>
            <Badge tone={tone} className="mt-2">
              {chip}
            </Badge>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="font-semibold text-slate-900">
          Tổng {program.durationYears} năm ước tính (học phí + chỗ ở)
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Học phí {program.durationYears} năm (niêm yết, lấy trung bình)</dt>
            <dd className="font-semibold text-slate-900">{vi(tuitionTotal)} triệu</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">
              {dorm ? "Ở ký túc xá" : "Thuê trọ"} ~{money(stayMonthly)} × {months} tháng
            </dt>
            <dd className="font-semibold text-slate-900">+ {vi(stayTotal)} triệu</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary-50 px-4 py-3">
          <span className="text-sm font-semibold text-primary-700">
            Tổng ≈ {vi(total)} triệu / {program.durationYears} năm
          </span>
          <span className="text-xl font-bold text-primary-700">≈ {vi(total / program.durationYears)} triệu/năm</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Chưa trừ học bổng, miễn giảm — tuỳ kết quả học tập và đối tượng. Chưa gồm ăn uống, đi lại.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/chi-phi#ho-tro" className={buttonClass({ variant: "outline", size: "sm" })}>
          Trả lời 6 câu điều kiện
        </Link>
        <Link href="/chi-phi#ho-tro" className="text-sm font-semibold text-primary-700 hover:underline">
          Xem nguồn chính sách
        </Link>
      </div>
    </section>
  );
}
