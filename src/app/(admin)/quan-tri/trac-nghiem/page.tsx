import type { Metadata } from "next";
import { LuDownload } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { quizAdminService, MIN_PER_TYPE } from "@/services/quiz-admin.service";
import { repositories } from "@/repositories";
import { RIASEC_ORDER } from "@/domain/riasec";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { QuizManager } from "@/components/admin/quiz-manager";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quản lý Trắc nghiệm RIASEC", robots: { index: false, follow: false } };

export default async function AdminQuizPage() {
  await adminPage("/quan-tri/trac-nghiem");
  const [data, majors] = await Promise.all([quizAdminService.get(), repositories.catalogAdmin.listMajors()]);
  const linked = Object.fromEntries(RIASEC_ORDER.map((t) => [t, majors.filter((m) => !m.hidden && m.riasec[0] === t).map((m) => m.name)]));
  return (
    <>
      <AdminHeader
        title="Quản lý Trắc nghiệm RIASEC & Ánh xạ ngành"
        crumb="Bài test RIASEC"
        updatedAt={data.updatedAt}
        actions={
          <a href="/api/admin/quiz" download className={buttonClass({ variant: "outline", size: "sm" })}>
            <LuDownload className="size-4" aria-hidden /> Xuất cấu hình
          </a>
        }
      />
      <AdminBody>
        <p className="text-[15px] text-slate-500">Thiết lập câu hỏi đánh giá tính cách và điều chỉnh thuật toán ánh xạ ngành học gợi ý.</p>
        <QuizManager
          questions={data.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, hidden: !!q.hidden, custom: !!q.custom, edited: data.edited.has(q.id) }))}
          weights={data.typeWeights}
          linked={linked}
          minPerType={MIN_PER_TYPE}
        />
      </AdminBody>
    </>
  );
}
