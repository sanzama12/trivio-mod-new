import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowRight, LuDatabase, LuFileText, LuFilter, LuListChecks, LuReceipt, LuScale, LuTriangleAlert } from "react-icons/lu";
import { ADMISSION_METHODS, METHOD_KEYS, PRIORITY_REDUCTION_THRESHOLD } from "@/services";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Cách Trovio gợi ý & nguồn dữ liệu" };

const sources = [
  { icon: LuFileText, title: "Đề án tuyển sinh từ trường", desc: "Thông tin chỉ tiêu, tổ hợp, mã ngành và điều kiện xét tuyển lấy từ văn bản đề án công bố hằng năm." },
  { icon: LuReceipt, title: "Thông báo học phí chính thức", desc: "Biểu phí được cập nhật từ cổng thông tin và website chính thức của từng trường." },
  { icon: LuDatabase, title: "Điểm chuẩn theo phương thức", desc: "Điểm chuẩn 3 năm của phương thức điểm thi THPT và năm gần nhất của học bạ, ĐGNL — so sánh đúng thang điểm với điểm của bạn." },
];

const steps = [
  { icon: LuScale, title: "Đối chiếu điểm & tổ hợp", desc: `Tổng 3 môn theo tổ hợp + điểm ưu tiên. Từ ${PRIORITY_REDUCTION_THRESHOLD} điểm trở lên, điểm ưu tiên giảm dần theo quy chế.` },
  { icon: LuFilter, title: "Lọc theo ngân sách & khu vực", desc: "Loại bỏ chương trình vượt học phí tối đa, ngoài khu vực hoặc loại hình trường bạn chọn." },
  { icon: LuListChecks, title: "Xếp hạng theo độ phù hợp", desc: "Ưu tiên Vừa sức, rồi An toàn, sau đó Thử sức; trong mỗi nhóm xếp theo điểm chuẩn." },
];

const levels = [
  { name: "An toàn", rule: "Điểm của bạn cao hơn điểm chuẩn gần nhất từ 1 điểm trở lên (thang 30).", cls: "border-success-100 bg-success-50 text-success-700" },
  { name: "Vừa sức", rule: "Chênh lệch trong khoảng −0,5 đến dưới +1 điểm (thang 30).", cls: "border-primary-200 bg-primary-50 text-primary-700" },
  { name: "Thử sức", rule: "Điểm của bạn thấp hơn điểm chuẩn hơn 0,5 điểm (thang 30).", cls: "border-accent-200 bg-accent-50 text-accent-700" },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-slate-50">
        <div className="container-page pt-6 pb-14">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Cách gợi ý & dữ liệu" }]} />
          <div className="mt-8 text-center">
            <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">Hệ thống gợi ý minh bạch</span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">Cách Trovio gợi ý cho bạn</h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Nguồn dữ liệu, quy trình lọc và cách chúng tôi xếp loại mức độ phù hợp – để bạn tự kiểm chứng mọi gợi ý.</p>
          </div>
        </div>
      </section>

      <div className="container-page space-y-16 py-12">
        <section id="nguon-du-lieu">
          <SectionHeading title="Nguồn dữ liệu" subtitle="Mỗi trang chương trình ghi rõ nguồn và ngày kiểm tra gần nhất." />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {sources.map((s) => (
              <Card key={s.title} className="p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title="Quy trình 3 bước" subtitle="Thuật toán sử dụng thông tin khách quan bạn cung cấp để lọc và sắp xếp." />
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <span className="rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-bold text-white">BƯỚC {i + 1}</span>
                <h3 className="mt-4 flex items-center gap-2 font-bold">
                  <s.icon className="size-5 text-primary-600" aria-hidden /> {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHeading title="Ý nghĩa nhãn phù hợp" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {levels.map((l) => (
              <div key={l.name} className={`rounded-2xl border p-5 ${l.cls}`}>
                <p className="font-bold">{l.name}</p>
                <p className="mt-1 text-sm text-slate-700">{l.rule}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="phuong-thuc">
          <SectionHeading title="Quy đổi theo phương thức xét tuyển" subtitle="Ngưỡng An toàn / Vừa sức và điểm ưu tiên được quy đổi theo tỉ lệ thang điểm của từng phương thức." />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Phương thức</th>
                  <th scope="col" className="px-4 py-3">Thang</th>
                  <th scope="col" className="px-4 py-3">An toàn khi cao hơn chuẩn</th>
                  <th scope="col" className="px-4 py-3">Thử sức khi thấp hơn chuẩn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {METHOD_KEYS.map((k) => {
                  const m = ADMISSION_METHODS[k];
                  return (
                    <tr key={k}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{m.label}</td>
                      <td className="px-4 py-3">{m.max}</td>
                      <td className="px-4 py-3">≥ {1 * m.factor} điểm</td>
                      <td className="px-4 py-3">&gt; {0.5 * m.factor} điểm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="danh-cho-ban">
          <SectionHeading title="Gợi ý “Dành cho bạn” được tính thế nào" subtitle="Mỗi chương trình nhận một điểm tổng hợp; hệ thống lấy 6 chương trình cao nhất, tối đa 2 chương trình cùng ngành hoặc cùng trường." />
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["45%", "Sở thích", "Độ khớp giữa mã RIASEC của bạn và mã Holland của ngành."],
              ["35%", "Khả năng trúng tuyển", "Vừa sức được ưu tiên nhất, rồi An toàn, sau đó Thử sức — theo đúng phương thức bạn nhập."],
              ["10%", "Vị trí", "Trường cùng miền với tỉnh/thành trong hồ sơ của bạn."],
              ["10%", "Nhóm ngành", "Thuộc nhóm ngành bạn chọn ở bước nhập điểm."],
            ].map(([w, t, d]) => (
              <Card key={t} className="p-5">
                <p className="text-2xl font-extrabold text-primary-600">{w}</p>
                <p className="mt-1 font-bold">{t}</p>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">Chương trình vượt ngân sách, ngoài khu vực bạn chọn, hoặc không xét tổ hợp/phương thức của bạn sẽ bị loại trước khi xếp hạng.</p>
          <p className="mt-2 text-sm text-slate-500">
            Kết quả <Link href="/trac-nghiem/phong-cach" className="font-semibold text-primary-600 hover:underline">mini-test phong cách làm việc</Link> và mã MBTI bạn tự nhập chỉ dùng để
            giải thích thêm (dòng “Phong cách” trên thẻ gợi ý), <strong>không</strong> cộng hay trừ vào điểm tổng hợp.
          </p>
        </section>

        <section id="kiem-tra-nguyen-vong">
          <SectionHeading title="“Kiểm tra danh sách của tôi” kiểm tra gì" subtitle="Thí sinh chỉ trúng tuyển nguyện vọng có thứ tự cao nhất mà mình đủ điều kiện, nên thứ tự quyết định kết quả." />
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              "Có ít nhất một nguyện vọng An toàn (nên đặt ở cuối danh sách).",
              "Thứ tự từ khó đến dễ: một nguyện vọng An toàn đứng trước nguyện vọng Thử sức sẽ “che” nguyện vọng phía sau.",
              "Chương trình có xét tổ hợp và phương thức bạn đang dùng.",
              "Học phí nằm trong ngân sách bạn đặt; danh sách không quá rủi ro hoặc quá an toàn.",
            ].map((t) => (
              <li key={t} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <LuListChecks className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading title="Giới hạn hệ thống & khuyến cáo" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Giá trị tham khảo khách quan", "Mọi gợi ý dựa trên dữ liệu các năm trước. Điểm chuẩn thực tế phụ thuộc chỉ tiêu và phổ điểm từng năm, không thể dự đoán chắc chắn."],
              ["Phụ thuộc biến động thực tế", "Trường có thể thay đổi tổ hợp, phương thức, học phí sau khi dữ liệu được cập nhật. Luôn đối chiếu với cổng tuyển sinh chính thức."],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-5">
                <LuTriangleAlert className="mt-0.5 size-5 shrink-0 text-accent-700" aria-hidden />
                <div>
                  <p className="font-bold text-accent-700">{t}</p>
                  <p className="mt-1 text-sm text-slate-700">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-white p-8 shadow-card md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold tracking-wider text-success-700 uppercase">Cập nhật: 09/2026</p>
            <h2 className="mt-2 text-xl font-bold">Chu kỳ cập nhật & rà soát sai sót</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">Dữ liệu được rà soát theo mùa tuyển sinh. Khi phát hiện sai lệch, bạn có thể báo để đội biên tập kiểm tra trong 48 giờ làm việc.</p>
          </div>
          <Link href="/tro-giup#bao-loi" className={buttonClass()}>
            Báo dữ liệu sai <LuArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </div>
    </>
  );
}
