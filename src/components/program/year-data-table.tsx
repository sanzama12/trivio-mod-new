import { ADMISSION_STATUS_LABELS, type AdmissionStatus, type ProgramYearData } from "@/domain/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONE: Record<AdmissionStatus, BadgeTone> = { "dang-tuyen": "success", "tam-dung": "warning", "ngung-tuyen": "danger", "chua-cong-bo": "slate" };

const tuition = (r: ProgramYearData) => {
  if (r.tuitionMin == null && r.tuitionMax == null) return "Chưa có dữ liệu";
  if (r.tuitionMin === r.tuitionMax || r.tuitionMax == null) return `${r.tuitionMin} triệu/năm`;
  if (r.tuitionMin == null) return `đến ${r.tuitionMax} triệu/năm`;
  return `${r.tuitionMin}–${r.tuitionMax} triệu/năm`;
};

/** Trạng thái tuyển sinh, chỉ tiêu và học phí của chương trình theo từng năm. */
export function YearDataTable({ rows }: { rows: ProgramYearData[] }) {
  if (!rows.length) return null;
  return (
    <div className="mb-6 border-b border-slate-200 pb-6">
      <h3 className="mb-3 font-semibold text-slate-900">Tuyển sinh theo từng năm</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Trạng thái tuyển sinh, chỉ tiêu và học phí theo năm</caption>
          <thead className="border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">Năm</th>
              <th scope="col" className="py-2 pr-3 font-medium">Trạng thái</th>
              <th scope="col" className="py-2 pr-3 font-medium">Chỉ tiêu</th>
              <th scope="col" className="py-2 font-medium">Học phí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row" className="py-2 pr-3 font-semibold text-slate-900">{r.year}</th>
                <td className="py-2 pr-3"><Badge tone={TONE[r.status]}>{ADMISSION_STATUS_LABELS[r.status]}</Badge></td>
                <td className="py-2 pr-3 text-slate-800">{r.quota ?? "Chưa có dữ liệu"}</td>
                <td className="py-2 text-slate-800">{tuition(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.note) && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
          {rows.filter((r) => r.note).map((r) => <li key={r.year}>Năm {r.year}: {r.note}</li>)}
        </ul>
      )}
    </div>
  );
}
