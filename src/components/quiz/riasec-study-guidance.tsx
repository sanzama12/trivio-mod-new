import Link from "next/link";
import { LuArrowUpRight, LuExternalLink } from "react-icons/lu";
import { RIASEC_INFO } from "@/domain/riasec";
import { rankRiasecStudyGroups, type RiasecStudyGroup } from "@/domain/riasec-guidance";
import { RIASEC_SOURCE_URL } from "@/domain/riasec-questions";
import type { RiasecResult } from "@/domain/types";

const MAJOR_CATALOG_SOURCE = "https://vanban.chinhphu.vn/?pageid=27160&docid=205986";

export function RiasecStudyGuidance({ result, groups }: { result: RiasecResult; groups: RiasecStudyGroup[] }) {
  const ranked = rankRiasecStudyGroups(result, groups);
  return <section className="mt-7 border-t border-slate-200 pt-6" aria-labelledby="study-groups-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="study-groups-title" className="text-lg font-bold text-slate-950">Nhóm ngành nên tìm hiểu trước</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Thứ tự dựa trên điểm sở thích của bạn và ba nhãn RIASEC mà TriOVO gắn cho từng nhóm ngành. Đây là thứ tự khám phá, không phải kết luận về năng lực học hay cơ hội trúng tuyển.</p>
      </div>
      <Link href="/nganh" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">Tất cả nhóm ngành <LuArrowUpRight className="size-4" aria-hidden /></Link>
    </div>

    {ranked.length ? <ol className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
      {ranked.map((group, index) => <li key={group.id} className="grid gap-2 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
        <span className="text-sm font-bold text-primary-700 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{group.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">TriOVO quy chiếu nhóm này với {group.riasec.map((type) => `${RIASEC_INFO[type].label} (${type}: ${result.percents[type].toLocaleString("vi-VN")}/100)`).join(", ")}. Điểm đối chiếu có trọng số 3:2:1 là {group.score.toLocaleString("vi-VN")}/100.</p>
        </div>
        <Link href={`/nganh?group=${encodeURIComponent(group.id)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">Xem ngành <LuArrowUpRight className="size-4" aria-hidden /></Link>
      </li>)}
    </ol> : <p className="mt-5 border-y border-slate-200 py-5 text-sm leading-6 text-slate-600">Điểm sáu nhóm gần nhau nên chưa có cơ sở để xếp nhóm ngành ưu tiên. Bạn có thể xem toàn bộ nhóm ngành và đối chiếu thêm môn học, kết quả học tập, điều kiện tài chính và trải nghiệm thực tế.</p>}

    <div className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
      <p><strong className="text-slate-800">Cơ sở phương pháp:</strong> <a href={RIASEC_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">O*NET Interest Profiler Manual <LuExternalLink className="size-3.5" aria-hidden /></a> mô tả mô hình sáu nhóm sở thích và cách dùng trong khám phá nghề. Bộ câu hỏi tiếng Việt trên TriOVO do nhóm dự án biên soạn, chưa được kiểm định chuẩn hóa.</p>
      <p><strong className="text-slate-800">Cơ sở danh mục:</strong> <a href={MAJOR_CATALOG_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">Thông tư 09/2022/TT-BGDĐT <LuExternalLink className="size-3.5" aria-hidden /></a> quy định danh mục ngành đào tạo đại học. Văn bản này không quy định ngành nào phù hợp với một cá nhân; liên hệ giữa nhóm ngành và RIASEC ở trên là quy tắc tham khảo do TriOVO xây dựng.</p>
    </div>
  </section>;
}
