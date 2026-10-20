import { LuAward } from "react-icons/lu";
import type { School } from "@/domain/types";
import { Badge } from "@/components/ui/badge";

/** Chỉ hiển thị hỗ trợ tài chính khi trường đã có dữ liệu riêng; không dùng chính sách chung làm fallback. */
export function FinanceBlock({ school }: { school: Pick<School, "scholarships"> }) {
  const scholarships = school.scholarships.trim();
  if (!scholarships) return null;

  return (
    <section aria-labelledby="tai-chinh" className="mt-6 rounded-xl border border-slate-200 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="tai-chinh" className="font-semibold text-slate-900">
          Học bổng của trường
        </h3>
        <Badge tone="success">Có dữ liệu theo trường</Badge>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 p-4">
        <p className="flex items-center gap-2 font-semibold text-slate-900">
          <LuAward className="size-4 text-primary-600" aria-hidden /> Học bổng
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{scholarships}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Trovio không tự suy diễn miễn giảm học phí, vay vốn hoặc ký túc xá khi chưa có dữ liệu riêng của trường.
      </p>
    </section>
  );
}
